/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';

import { RentalsService } from './rentals.service';
import { Rental, RentalStatus } from './entities/rental.entity';
import { BagListing } from '../listings/entities/bag-listing.entity';
import { StripeService } from 'src/stripe/stripe.service';
import { NotificationsService } from 'src/notifications/notifications.service';

type MockRepository<T = any> = {
  [K in keyof Repository<T>]: jest.Mock;
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const RENTER_ID = 'renter-uuid';
const OWNER_ID = 'owner-uuid';
const LISTING_ID = 'listing-uuid';
const RENTAL_ID = 'rental-uuid';

// ─────────────────────────────────────────────
// Factories
// ─────────────────────────────────────────────

function makeListing(overrides: Partial<BagListing> = {}): BagListing {
  return {
    id: LISTING_ID,
    userId: OWNER_ID,
    pricePerDay: 50,
    title: 'Titleist Set',
    description: 'Nice clubs',
    photos: [],
    hand: 'right',
    gender: 'unisex',
    city: 'Buenos Aires',
    state: 'BA',
    clubs: [],
    user: { id: OWNER_ID, stripeAccountId: 'acct_stripe' } as any,
    ...overrides,
  } as BagListing;
}

function makeRental(overrides: Partial<Rental> = {}): Rental {
  return {
    id: RENTAL_ID,
    listingId: LISTING_ID,
    renterId: RENTER_ID,
    ownerId: OWNER_ID,
    startDate: new Date('2026-05-01'),
    endDate: new Date('2026-05-05'),
    totalDays: 4,
    pricePerDay: 50,
    totalAmount: 200,
    status: RentalStatus.PENDING_PAYMENT,
    paymentStatus: 'pending',
    paymentIntentId: null,
    paymentMethod: null,
    paidAt: null,
    refundAmount: null,
    refundedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    listing: makeListing(),
    renter: {
      id: RENTER_ID,
      firstName: 'Willy',
      lastName: 'M',
      email: 'w@test.com',
      avatarUrl: null,
      location: null,
    } as any,
    owner: { id: OWNER_ID } as any,
    ...overrides,
  } as Rental;
}

function makeQueryBuilder(result: unknown = []) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
    getMany: jest.fn().mockResolvedValue(result),
  };
  return qb;
}

function makeRentalRepo(overrides: Partial<MockRepository<Rental>> = {}) {
  return {
    createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder()),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as MockRepository<Rental>;
}

function makeListingRepo(overrides: Partial<MockRepository<BagListing>> = {}) {
  return {
    findOne: jest.fn(),
    ...overrides,
  } as MockRepository<BagListing>;
}

// ─────────────────────────────────────────────
// Suite
// ─────────────────────────────────────────────

describe('RentalsService', () => {
  let service: RentalsService;
  let rentalRepo: ReturnType<typeof makeRentalRepo>;
  let listingRepo: ReturnType<typeof makeListingRepo>;
  let stripeService: { createRefund: jest.Mock };
  let notificationsService: {
    notifyRentalConfirmed: jest.Mock;
    notifyRentalCancelledByRenter: jest.Mock;
  };

  beforeEach(async () => {
    rentalRepo = makeRentalRepo();
    listingRepo = makeListingRepo();
    stripeService = { createRefund: jest.fn().mockResolvedValue(undefined) };
    notificationsService = {
      notifyRentalConfirmed: jest.fn().mockResolvedValue(undefined),
      notifyRentalCancelledByRenter: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentalsService,
        { provide: getRepositoryToken(Rental), useValue: rentalRepo },
        { provide: getRepositoryToken(BagListing), useValue: listingRepo },
        { provide: StripeService, useValue: stripeService },
        { provide: NotificationsService, useValue: notificationsService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(10) },
        },
      ],
    }).compile();

    service = module.get<RentalsService>(RentalsService);
  });

  // ─────────────────────────────────────────────
  // checkAvailability
  // ─────────────────────────────────────────────

  describe('checkAvailability', () => {
    it('given endDate is before startDate, when checkAvailability is called, then it throws BadRequestException', async () => {
      // given
      const dto = {
        listingId: LISTING_ID,
        startDate: '2026-05-05',
        endDate: '2026-05-01',
      };

      // when / then
      await expect(service.checkAvailability(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('given no overlapping rentals exist, when checkAvailability is called, then it returns available: true', async () => {
      // given
      const dto = {
        listingId: LISTING_ID,
        startDate: '2026-06-01',
        endDate: '2026-06-05',
      };
      const qb = makeQueryBuilder([]);
      rentalRepo.createQueryBuilder.mockReturnValue(qb);

      // when
      const result = await service.checkAvailability(dto);

      // then
      expect(result.available).toBe(true);
      expect(result.blockedDates).toBeUndefined();
    });

    it('given overlapping rentals exist, when checkAvailability is called, then it returns available: false with blockedDates', async () => {
      // given
      const dto = {
        listingId: LISTING_ID,
        startDate: '2026-05-01',
        endDate: '2026-05-05',
      };
      const conflictingRental = makeRental({
        startDate: '2026-05-02' as any,
        endDate: '2026-05-04' as any,
      });
      const qb = makeQueryBuilder([conflictingRental]);
      rentalRepo.createQueryBuilder.mockReturnValue(qb);

      // when
      const result = await service.checkAvailability(dto);

      // then
      expect(result.available).toBe(false);
      expect(result.blockedDates).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────
  // createRental
  // ─────────────────────────────────────────────

  describe('createRental', () => {
    it('given the listing does not exist, when createRental is called, then it throws NotFoundException', async () => {
      // given
      listingRepo.findOne.mockResolvedValue(null);
      const dto = {
        listingId: LISTING_ID,
        startDate: '2026-06-01',
        endDate: '2026-06-05',
      };

      // when / then
      await expect(service.createRental(RENTER_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('given the renter is the listing owner, when createRental is called, then it throws BadRequestException', async () => {
      // given
      listingRepo.findOne.mockResolvedValue(makeListing({ userId: RENTER_ID }));
      const dto = {
        listingId: LISTING_ID,
        startDate: '2026-06-01',
        endDate: '2026-06-05',
      };

      // when / then
      await expect(service.createRental(RENTER_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('given the requested dates are already booked, when createRental is called, then it throws BadRequestException', async () => {
      // given
      listingRepo.findOne.mockResolvedValue(makeListing());
      const qb = makeQueryBuilder([makeRental()]);
      rentalRepo.createQueryBuilder.mockReturnValue(qb);
      const dto = {
        listingId: LISTING_ID,
        startDate: '2026-05-01',
        endDate: '2026-05-05',
      };

      // when / then
      await expect(service.createRental(RENTER_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('given a valid listing and available dates, when createRental is called, then it persists the rental with correct pricing and PENDING_PAYMENT status', async () => {
      // given
      listingRepo.findOne.mockResolvedValue(makeListing());
      const qb = makeQueryBuilder([]);
      rentalRepo.createQueryBuilder.mockReturnValue(qb);
      const newRental = makeRental();
      rentalRepo.create.mockReturnValue(newRental);
      rentalRepo.save.mockResolvedValue(newRental);
      const dto = {
        listingId: LISTING_ID,
        startDate: '2026-06-01',
        endDate: '2026-06-05',
      };

      // when
      const result = await service.createRental(RENTER_ID, dto);

      // then
      expect(rentalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          renterId: RENTER_ID,
          ownerId: OWNER_ID,
          totalDays: 4,
          totalAmount: 200, // $50/day × 4 days
          status: RentalStatus.PENDING_PAYMENT,
        }),
      );
      expect(result.status).toBe(RentalStatus.PENDING_PAYMENT);
    });

    it('given a new rental is created, when it is persisted, then expiresAt is set approximately 15 minutes from now', async () => {
      // given
      listingRepo.findOne.mockResolvedValue(makeListing());
      const qb = makeQueryBuilder([]);
      rentalRepo.createQueryBuilder.mockReturnValue(qb);
      rentalRepo.create.mockImplementation((data: any) => data);
      rentalRepo.save.mockImplementation(async (data: any) => data);
      const dto = {
        listingId: LISTING_ID,
        startDate: '2026-06-01',
        endDate: '2026-06-05',
      };

      // when
      const result = await service.createRental(RENTER_ID, dto);

      // then
      const diffMinutes =
        (result.expiresAt.getTime() - Date.now()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThan(14);
      expect(diffMinutes).toBeLessThan(16);
    });
  });

  // ─────────────────────────────────────────────
  // confirmPayment
  // ─────────────────────────────────────────────

  describe('confirmPayment', () => {
    it('given the rental does not exist, when confirmPayment is called, then it throws NotFoundException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(null);

      // when / then
      await expect(service.confirmPayment(RENTAL_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('given the rental is not in PENDING_PAYMENT status, when confirmPayment is called, then it throws BadRequestException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        makeRental({ status: RentalStatus.CONFIRMED }),
      );

      // when / then
      await expect(service.confirmPayment(RENTAL_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('given a rental in PENDING_PAYMENT, when confirmPayment is called, then it transitions to CONFIRMED and triggers the notification', async () => {
      // given
      const rental = makeRental({ status: RentalStatus.PENDING_PAYMENT });
      rentalRepo.findOne.mockResolvedValue(rental);
      rentalRepo.save.mockImplementation(async (r: any) => r);

      // when
      const result = await service.confirmPayment(RENTAL_ID, 'pi_123');

      // then
      expect(result.status).toBe(RentalStatus.CONFIRMED);
      expect(result.paymentStatus).toBe('paid');
      expect(result.paymentIntentId).toBe('pi_123');
      expect(result.paidAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeNull();
      expect(notificationsService.notifyRentalConfirmed).toHaveBeenCalledWith(
        result,
      );
    });
  });

  // ─────────────────────────────────────────────
  // cancelByRenter
  // ─────────────────────────────────────────────

  describe('cancelByRenter', () => {
    it('given the rental does not exist, when cancelByRenter is called, then it throws NotFoundException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(null);

      // when / then
      await expect(
        service.cancelByRenter(RENTER_ID, RENTAL_ID, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('given the requesting user is not the renter, when cancelByRenter is called, then it throws ForbiddenException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        makeRental({ renterId: 'another-user-id' }),
      );

      // when / then
      await expect(
        service.cancelByRenter(RENTER_ID, RENTAL_ID, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('given the rental is in ACTIVE status, when cancelByRenter is called, then it throws BadRequestException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        makeRental({ status: RentalStatus.ACTIVE }),
      );

      // when / then
      await expect(
        service.cancelByRenter(RENTER_ID, RENTAL_ID, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('given a CONFIRMED rental created less than 24 hours ago, when the renter cancels, then the full amount is refunded', async () => {
      // given
      const rental = makeRental({
        status: RentalStatus.CONFIRMED,
        totalAmount: 200,
        createdAt: new Date(), // just now
      });
      rentalRepo.findOne.mockResolvedValue(rental);
      rentalRepo.save.mockImplementation(async (r: any) => r);

      // when
      const result = await service.cancelByRenter(RENTER_ID, RENTAL_ID, {
        reason: 'Plans changed',
      });

      // then
      expect(result.status).toBe(RentalStatus.CANCELLED_BY_RENTER);
      expect(Number(result.refundAmount)).toBe(200);
      expect(result.refundedAt).toBeInstanceOf(Date);
      expect(result.cancellationReason).toBe('Plans changed');
      expect(
        notificationsService.notifyRentalCancelledByRenter,
      ).toHaveBeenCalledWith(result);
    });

    it('given a rental created more than 24 hours ago, when the renter cancels, then no refund is issued', async () => {
      // given
      const oldCreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const rental = makeRental({
        status: RentalStatus.CONFIRMED,
        totalAmount: 200,
        createdAt: oldCreatedAt,
      });
      rentalRepo.findOne.mockResolvedValue(rental);
      rentalRepo.save.mockImplementation(async (r: any) => r);

      // when
      const result = await service.cancelByRenter(RENTER_ID, RENTAL_ID, {});

      // then
      expect(result.status).toBe(RentalStatus.CANCELLED_BY_RENTER);
      expect(Number(result.refundAmount)).toBe(0);
      expect(result.refundedAt).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // cancelByOwner
  // ─────────────────────────────────────────────

  describe('cancelByOwner', () => {
    it('given the rental does not exist, when cancelByOwner is called, then it throws NotFoundException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(null);

      // when / then
      await expect(
        service.cancelByOwner(OWNER_ID, RENTAL_ID, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('given the requesting user is not the owner, when cancelByOwner is called, then it throws ForbiddenException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        makeRental({ ownerId: 'another-owner-id' }),
      );

      // when / then
      await expect(
        service.cancelByOwner(OWNER_ID, RENTAL_ID, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('given the rental is in PENDING_PAYMENT status, when the owner tries to cancel, then it throws BadRequestException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        makeRental({ status: RentalStatus.PENDING_PAYMENT }),
      );

      // when / then
      await expect(
        service.cancelByOwner(OWNER_ID, RENTAL_ID, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('given a CONFIRMED rental with a paymentIntentId, when the owner cancels, then Stripe is refunded and the rental is cancelled', async () => {
      // given
      const rental = makeRental({
        status: RentalStatus.CONFIRMED,
        paymentIntentId: 'pi_abc',
        totalAmount: 200,
      });
      rentalRepo.findOne.mockResolvedValue(rental);
      rentalRepo.save.mockImplementation(async (r: any) => r);

      // when
      const result = await service.cancelByOwner(OWNER_ID, RENTAL_ID, {
        reason: 'Emergency',
      });

      // then
      expect(stripeService.createRefund).toHaveBeenCalledWith('pi_abc');
      expect(result.status).toBe(RentalStatus.CANCELLED_BY_OWNER);
      expect(Number(result.refundAmount)).toBe(200);
      expect(result.refundedAt).toBeInstanceOf(Date);
    });

    it('given Stripe refund fails, when the owner cancels, then it throws BadRequestException with the Stripe error message', async () => {
      // given
      const rental = makeRental({
        status: RentalStatus.CONFIRMED,
        paymentIntentId: 'pi_abc',
      });
      rentalRepo.findOne.mockResolvedValue(rental);
      stripeService.createRefund.mockRejectedValue(new Error('card_error'));

      // when / then
      await expect(
        service.cancelByOwner(OWNER_ID, RENTAL_ID, {}),
      ).rejects.toThrow('Stripe refund failed: card_error');
    });

    it('given a CONFIRMED rental without paymentIntentId, when the owner cancels, then Stripe is not called and the rental is cancelled', async () => {
      // given
      const rental = makeRental({
        status: RentalStatus.CONFIRMED,
        paymentIntentId: null,
      });
      rentalRepo.findOne.mockResolvedValue(rental);
      rentalRepo.save.mockImplementation(async (r: any) => r);

      // when
      const result = await service.cancelByOwner(OWNER_ID, RENTAL_ID, {});

      // then
      expect(stripeService.createRefund).not.toHaveBeenCalled();
      expect(result.status).toBe(RentalStatus.CANCELLED_BY_OWNER);
    });
  });

  // ─────────────────────────────────────────────
  // expirePendingPayments (cron job)
  // ─────────────────────────────────────────────

  describe('expirePendingPayments', () => {
    it('given expired PENDING_PAYMENT rentals, when the cron runs, then the QueryBuilder marks them as EXPIRED', async () => {
      // given
      const qb = makeQueryBuilder();
      rentalRepo.createQueryBuilder.mockReturnValue(qb);

      // when
      await service.expirePendingPayments();

      // then
      expect(qb.update).toHaveBeenCalledWith(Rental);
      expect(qb.set).toHaveBeenCalledWith({ status: RentalStatus.EXPIRED });
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // activateConfirmedRentals (cron job)
  // ─────────────────────────────────────────────

  describe('activateConfirmedRentals', () => {
    it('given CONFIRMED rentals whose start date has arrived, when the cron runs, then the QueryBuilder transitions them to ACTIVE', async () => {
      // given
      const qb = makeQueryBuilder();
      rentalRepo.createQueryBuilder.mockReturnValue(qb);

      // when
      await service.activateConfirmedRentals();

      // then
      expect(qb.set).toHaveBeenCalledWith({ status: RentalStatus.ACTIVE });
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // completeActiveRentals (cron job)
  // ─────────────────────────────────────────────

  describe('completeActiveRentals', () => {
    it('given ACTIVE rentals whose end date has passed, when the cron runs, then the QueryBuilder transitions them to COMPLETED', async () => {
      // given
      const qb = makeQueryBuilder();
      rentalRepo.createQueryBuilder.mockReturnValue(qb);

      // when
      await service.completeActiveRentals();

      // then
      expect(qb.set).toHaveBeenCalledWith({ status: RentalStatus.COMPLETED });
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // getBlockedDates
  // ─────────────────────────────────────────────

  describe('getBlockedDates', () => {
    it('given no active rentals for the listing, when getBlockedDates is called, then it returns an empty array', async () => {
      // given
      rentalRepo.find.mockResolvedValue([]);

      // when
      const result = await service.getBlockedDates(LISTING_ID);

      // then
      expect(result).toEqual([]);
    });

    it('given a rental spanning 4 days, when getBlockedDates is called, then it returns each individual date in the range', async () => {
      // given
      const rental = makeRental({
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-04'),
        status: RentalStatus.CONFIRMED,
      });
      rentalRepo.find.mockResolvedValue([rental]);

      // when
      const result = await service.getBlockedDates(LISTING_ID);

      // then
      expect(result).toContain('2026-06-01');
      expect(result).toContain('2026-06-02');
      expect(result).toContain('2026-06-03');
      expect(result).toContain('2026-06-04');
      expect(result).toHaveLength(4);
    });

    it('given two rentals with overlapping dates, when getBlockedDates is called, then the result contains no duplicate dates', async () => {
      // given
      const rental1 = makeRental({
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
      });
      const rental2 = makeRental({
        startDate: new Date('2026-06-02'),
        endDate: new Date('2026-06-04'),
      });
      rentalRepo.find.mockResolvedValue([rental1, rental2]);

      // when
      const result = await service.getBlockedDates(LISTING_ID);

      // then
      const unique = new Set(result);
      expect(unique.size).toBe(result.length);
    });
  });

  // ─────────────────────────────────────────────
  // getRentalStatus
  // ─────────────────────────────────────────────

  describe('getRentalStatus', () => {
    it('given the rental does not exist, when getRentalStatus is called, then it throws NotFoundException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(null);

      // when / then
      await expect(service.getRentalStatus(RENTAL_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('given an existing rental, when getRentalStatus is called, then it returns only id and status (lightweight response)', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue({
        id: RENTAL_ID,
        status: RentalStatus.CONFIRMED,
      });

      // when
      const result = await service.getRentalStatus(RENTAL_ID);

      // then
      expect(result).toEqual({ id: RENTAL_ID, status: RentalStatus.CONFIRMED });
    });
  });

  // ─────────────────────────────────────────────
  // getRentalRequestById
  // ─────────────────────────────────────────────

  describe('getRentalRequestById', () => {
    it('given the rental does not exist, when getRentalRequestById is called, then it throws NotFoundException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(null);

      // when / then
      await expect(service.getRentalRequestById(RENTAL_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('given a CONFIRMED rental, when the owner views the request detail, then canDeny is true and canAccept is false', async () => {
      // given
      const rental = makeRental({ status: RentalStatus.CONFIRMED });
      rentalRepo.findOne.mockResolvedValue(rental);

      // when
      const result = await service.getRentalRequestById(RENTAL_ID);

      // then
      expect(result.canDeny).toBe(true);
      expect(result.canAccept).toBe(false);
    });

    it('given a PENDING_PAYMENT rental, when the owner views the request detail, then canAccept is true and canDeny is false', async () => {
      // given
      const rental = makeRental({ status: RentalStatus.PENDING_PAYMENT });
      rentalRepo.findOne.mockResolvedValue(rental);

      // when
      const result = await service.getRentalRequestById(RENTAL_ID);

      // then
      expect(result.canAccept).toBe(true);
      expect(result.canDeny).toBe(false);
    });

    it('given a rental with $200 total and 10% platform fee, when the owner views the breakdown, then they receive $180 after commission', async () => {
      // given
      const rental = makeRental({
        totalAmount: 200,
        status: RentalStatus.CONFIRMED,
      });
      rentalRepo.findOne.mockResolvedValue(rental);

      // when
      const result = await service.getRentalRequestById(RENTAL_ID);

      // then
      expect(result.commissionFee).toBe(20);
      expect(result.totalYouReceive).toBe(180);
      expect(result.commissionFeePercent).toBe(10);
    });
  });
});
