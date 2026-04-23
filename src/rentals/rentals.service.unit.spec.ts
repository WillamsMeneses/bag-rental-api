/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentalsService } from './rentals.service';
import { Rental, RentalStatus } from './entities/rental.entity';
import {
  BagListing,
  UserGender,
  HandType,
} from '../listings/entities/bag-listing.entity';
import { StripeService } from '../stripe/stripe.service';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

// ─────────────────────────────────────────────────────────────────────────────
// Factories
// ─────────────────────────────────────────────────────────────────────────────

const RENTER_ID = 'renter-123';
const OWNER_ID = 'owner-123';
const LISTING_ID = 'listing-123';
const RENTAL_ID = 'rental-123';

function mockListing(overrides: Partial<BagListing> = {}): BagListing {
  return {
    id: LISTING_ID,
    userId: OWNER_ID,
    title: 'Test Listing',
    description: 'Test Description',
    pricePerDay: 50,
    gender: UserGender.MALE,
    hand: HandType.RIGHT_HANDED,
    street: null,
    zipCode: null,
    state: 'BA',
    city: 'Buenos Aires',
    photos: [],
    isActive: true,
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    // user con stripeAccountId por defecto — sobreescribí si necesitás null
    user: { id: OWNER_ID, stripeAccountId: 'acct_stripe' } as any,
    clubs: [],
    ...overrides,
  };
}

function mockRental(overrides: Partial<Rental> = {}): Rental {
  return {
    id: RENTAL_ID,
    listingId: LISTING_ID,
    renterId: RENTER_ID,
    ownerId: OWNER_ID,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-05'),
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
    listing: mockListing(),
    renter: {
      id: RENTER_ID,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      avatarUrl: null,
      location: null,
    } as any,
    owner: { id: OWNER_ID } as any,
    ...overrides,
  };
}

/**
 * El service muta el objeto rental directamente antes de hacer save().
 * Este mock captura el estado mutado del objeto y lo retorna tal cual,
 * simulando lo que haría TypeORM al persistir y devolver la entidad.
 */
function mockSavePassthrough() {
  return jest.fn().mockImplementation(async (entity: any) => ({ ...entity }));
}

function makeQueryBuilder(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
    getMany: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite
// ─────────────────────────────────────────────────────────────────────────────

describe('RentalsService (unit)', () => {
  let service: RentalsService;
  let rentalRepo: jest.Mocked<Partial<Repository<Rental>>>;
  let listingRepo: jest.Mocked<Partial<Repository<BagListing>>>;
  let stripeService: jest.Mocked<Partial<StripeService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;

  beforeEach(async () => {
    rentalRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder()) as any,
      update: jest.fn(),
    };

    listingRepo = {
      findOne: jest.fn(),
    };

    stripeService = {
      createRefund: jest.fn(),
      createPaymentIntent: jest.fn(),
      createCheckoutSession: jest.fn(),
      constructWebhookEvent: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue(10), // 10% platform fee por defecto
    };

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
        { provide: ConfigService, useValue: configService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(RentalsService);
  });

  // ─────────────────────────────────────────────
  // cancelByOwner
  // ─────────────────────────────────────────────

  describe('cancelByOwner', () => {
    it('Given rental does not exist, When cancelByOwner is called, Then throws NotFoundException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(null);

      // when / then
      await expect(
        service.cancelByOwner(OWNER_ID, RENTAL_ID, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('Given requesting user is not the owner, When cancelByOwner is called, Then throws ForbiddenException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        mockRental({ ownerId: 'another-owner' }),
      );

      // when / then
      await expect(
        service.cancelByOwner(OWNER_ID, RENTAL_ID, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Given rental is in PENDING_PAYMENT status, When cancelByOwner is called, Then throws BadRequestException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        mockRental({ status: RentalStatus.PENDING_PAYMENT }),
      );

      // when / then
      await expect(
        service.cancelByOwner(OWNER_ID, RENTAL_ID, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('Given rental is in COMPLETED status, When cancelByOwner is called, Then throws BadRequestException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        mockRental({ status: RentalStatus.COMPLETED }),
      );

      // when / then
      await expect(
        service.cancelByOwner(OWNER_ID, RENTAL_ID, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('Given CONFIRMED rental with paymentIntentId, When cancelByOwner is called, Then issues Stripe refund and cancels the rental', async () => {
      // given
      const rental = mockRental({
        status: RentalStatus.CONFIRMED,
        paymentIntentId: 'pi_abc',
        totalAmount: 200,
      });
      rentalRepo.findOne.mockResolvedValue(rental);
      stripeService.createRefund.mockResolvedValue({ id: 'ref_123' } as any);
      rentalRepo.save.mockSave();

      // when
      const result = await service.cancelByOwner(OWNER_ID, RENTAL_ID, {
        reason: 'Item damaged',
      });

      // then
      expect(stripeService.createRefund).toHaveBeenCalledWith('pi_abc');
      expect(result.status).toBe(RentalStatus.CANCELLED_BY_OWNER);
      expect(Number(result.refundAmount)).toBe(200);
      expect(result.refundedAt).toBeInstanceOf(Date);
      expect(result.cancellationReason).toBe('Item damaged');
    });

    it('Given ACTIVE rental with paymentIntentId, When cancelByOwner is called, Then also issues Stripe refund', async () => {
      // given
      const rental = mockRental({
        status: RentalStatus.ACTIVE,
        paymentIntentId: 'pi_active',
        totalAmount: 150,
      });
      rentalRepo.findOne.mockResolvedValue(rental);
      stripeService.createRefund.mockResolvedValue({ id: 'ref_456' } as any);
      rentalRepo.save.mockSave();

      // when
      const result = await service.cancelByOwner(OWNER_ID, RENTAL_ID, {});

      // then
      expect(stripeService.createRefund).toHaveBeenCalledWith('pi_active');
      expect(result.status).toBe(RentalStatus.CANCELLED_BY_OWNER);
    });

    it('Given CONFIRMED rental without paymentIntentId, When cancelByOwner is called, Then Stripe is not called and rental is cancelled', async () => {
      // given
      const rental = mockRental({
        status: RentalStatus.CONFIRMED,
        paymentIntentId: null,
      });
      rentalRepo.findOne.mockResolvedValue(rental);
      rentalRepo.save.mockSave();

      // when
      const result = await service.cancelByOwner(OWNER_ID, RENTAL_ID, {});

      // then
      expect(stripeService.createRefund).not.toHaveBeenCalled();
      expect(result.status).toBe(RentalStatus.CANCELLED_BY_OWNER);
    });

    it('Given Stripe refund fails, When cancelByOwner is called, Then throws BadRequestException with error message', async () => {
      // given
      const rental = mockRental({
        status: RentalStatus.CONFIRMED,
        paymentIntentId: 'pi_abc',
      });
      rentalRepo.findOne.mockResolvedValue(rental);
      stripeService.createRefund.mockRejectedValue(
        new Error('Stripe connection error'),
      );

      // when / then
      await expect(
        service.cancelByOwner(OWNER_ID, RENTAL_ID, {}),
      ).rejects.toThrow('Stripe refund failed: Stripe connection error');
    });
  });

  // ─────────────────────────────────────────────
  // expirePendingPayments
  // ─────────────────────────────────────────────

  describe('expirePendingPayments', () => {
    it('Given expired PENDING_PAYMENT rentals exist, When expirePendingPayments is called, Then QueryBuilder sets status to EXPIRED', async () => {
      // given
      const qb = makeQueryBuilder();
      (rentalRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      // when
      await service.expirePendingPayments();

      // then
      expect(qb.update).toHaveBeenCalledWith(Rental);
      expect(qb.set).toHaveBeenCalledWith({ status: RentalStatus.EXPIRED });
      expect(qb.where).toHaveBeenCalledWith('status = :status', {
        status: RentalStatus.PENDING_PAYMENT,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'expires_at < :now',
        expect.objectContaining({ now: expect.any(Date) }),
      );
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // activateConfirmedRentals
  // ─────────────────────────────────────────────

  describe('activateConfirmedRentals', () => {
    it('Given CONFIRMED rentals with start_date <= today, When activateConfirmedRentals is called, Then QueryBuilder sets status to ACTIVE', async () => {
      // given
      const qb = makeQueryBuilder();
      (rentalRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      // when
      await service.activateConfirmedRentals();

      // then
      expect(qb.update).toHaveBeenCalledWith(Rental);
      expect(qb.set).toHaveBeenCalledWith({ status: RentalStatus.ACTIVE });
      expect(qb.where).toHaveBeenCalledWith('status = :status', {
        status: RentalStatus.CONFIRMED,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'start_date <= :today',
        expect.objectContaining({ today: expect.any(String) }),
      );
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // completeActiveRentals
  // ─────────────────────────────────────────────

  describe('completeActiveRentals', () => {
    it('Given ACTIVE rentals with end_date < today, When completeActiveRentals is called, Then QueryBuilder sets status to COMPLETED', async () => {
      // given
      const qb = makeQueryBuilder();
      (rentalRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      // when
      await service.completeActiveRentals();

      // then
      expect(qb.update).toHaveBeenCalledWith(Rental);
      expect(qb.set).toHaveBeenCalledWith({ status: RentalStatus.COMPLETED });
      expect(qb.where).toHaveBeenCalledWith('status = :status', {
        status: RentalStatus.ACTIVE,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'end_date < :today',
        expect.objectContaining({ today: expect.any(String) }),
      );
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // getUserRentals
  // ─────────────────────────────────────────────
  describe('getUserRentals', () => {
    it('Given page=1 limit=10, When getUserRentals, Then returns paginated response with pagination', async () => {
      const rentals = [mockRental(), mockRental()];
      rentalRepo.findAndCount = jest.fn().mockResolvedValue([rentals, 2]);

      const result = await service.getUserRentals('renter-123', {
        page: 1,
        limit: 10,
      });

      expect(rentalRepo.findAndCount).toHaveBeenCalledWith({
        where: { renterId: 'renter-123', status: expect.any(Object) },
        relations: ['listing', 'owner'],
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 0,
      });
      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('Given page=2 limit=5, When getUserRentals, Then skips first 5 records', async () => {
      rentalRepo.findAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.getUserRentals('renter-123', { page: 2, limit: 5 });

      expect(rentalRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5, skip: 5 }),
      );
    });
  });
  // ─────────────────────────────────────────────
  // getOwnerRentals
  // ─────────────────────────────────────────────

  // describe('getOwnerRentals', () => {
  //   it('Given page=1 limit=10, When getOwnerRentals is called, Then returns rentals filtered by ownerId', async () => {
  //     // given
  //     const rentals = [mockRental()];
  //     rentalRepo.findAndCount.mockResolvedValue([rentals, 1]);

  //     // when
  //     const result = await service.getOwnerRentals(OWNER_ID, {
  //       page: 1,
  //       limit: 10,
  //     });

  //     // then
  //     expect(rentalRepo.findAndCount).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         where: { ownerId: OWNER_ID, status: expect.anything() },
  //         relations: ['listing', 'renter'],
  //         order: { createdAt: 'DESC' },
  //         skip: 0,
  //         take: 10,
  //       }),
  //     );
  //     expect(result.data).toHaveLength(1);
  //     expect(result.meta.total).toBe(1);
  //   });

  //   it('Given page=3 limit=4, When getOwnerRentals is called, Then skips the first 8 records', async () => {
  //     // given
  //     rentalRepo.findAndCount.mockResolvedValue([[], 20]);

  //     // when
  //     await service.getOwnerRentals(OWNER_ID, { page: 3, limit: 4 });

  //     // then
  //     expect(rentalRepo.findAndCount).toHaveBeenCalledWith(
  //       expect.objectContaining({ skip: 8, take: 4 }),
  //     );
  //   });
  // });

  describe('getOwnerRentals', () => {
    it('Given page=1 limit=10, When getOwnerRentals, Then returns rentals filtered by ownerId', async () => {
      const rentals = [mockRental()];
      rentalRepo.findAndCount = jest.fn().mockResolvedValue([rentals, 1]);

      const result = await service.getOwnerRentals('owner-123', {
        page: 1,
        limit: 10,
      });

      expect(rentalRepo.findAndCount).toHaveBeenCalledWith({
        where: { ownerId: 'owner-123', status: expect.any(Object) },
        relations: ['listing', 'renter'],
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 0,
      });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('Given page=3 limit=4, When getOwnerRentals, Then uses correct skip', async () => {
      rentalRepo.findAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.getOwnerRentals('owner-123', { page: 3, limit: 4 });

      expect(rentalRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 4, skip: 8 }),
      );
    });
  });

  // ─────────────────────────────────────────────
  // getRentalStatus
  // ─────────────────────────────────────────────

  describe('getRentalStatus', () => {
    it('Given rental does not exist, When getRentalStatus is called, Then throws NotFoundException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(null);

      // when / then
      await expect(service.getRentalStatus(RENTAL_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Given an existing rental, When getRentalStatus is called, Then returns only id and status', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue({
        id: RENTAL_ID,
        status: RentalStatus.CONFIRMED,
      } as Rental);

      // when
      const result = await service.getRentalStatus(RENTAL_ID);

      // then
      expect(result).toEqual({ id: RENTAL_ID, status: RentalStatus.CONFIRMED });
    });

    it('Given an EXPIRED rental, When getRentalStatus is called, Then returns EXPIRED status', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue({
        id: RENTAL_ID,
        status: RentalStatus.EXPIRED,
      } as Rental);

      // when
      const result = await service.getRentalStatus(RENTAL_ID);

      // then
      expect(result.status).toBe(RentalStatus.EXPIRED);
    });
  });

  // ─────────────────────────────────────────────
  // getRentalRequestById
  // ─────────────────────────────────────────────

  describe('getRentalRequestById', () => {
    it('Given rental does not exist, When getRentalRequestById is called, Then throws NotFoundException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(null);

      // when / then
      await expect(service.getRentalRequestById(RENTAL_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Given a PENDING_PAYMENT rental, When owner views the detail, Then canAccept is true and canDeny is false', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        mockRental({ status: RentalStatus.PENDING_PAYMENT }),
      );

      // when
      const result = await service.getRentalRequestById(RENTAL_ID);

      // then
      expect(result.canAccept).toBe(true);
      expect(result.canDeny).toBe(false);
    });

    it('Given a CONFIRMED rental, When owner views the detail, Then canDeny is true and canAccept is false', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        mockRental({ status: RentalStatus.CONFIRMED }),
      );

      // when
      const result = await service.getRentalRequestById(RENTAL_ID);

      // then
      expect(result.canDeny).toBe(true);
      expect(result.canAccept).toBe(false);
    });

    it('Given a rental with $200 total and 10% platform fee, When getRentalRequestById is called, Then commission is $20 and owner receives $180', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        mockRental({ totalAmount: 200, status: RentalStatus.CONFIRMED }),
      );
      configService.get.mockReturnValue(10);

      // when
      const result = await service.getRentalRequestById(RENTAL_ID);

      // then
      expect(result.totalAmount).toBe(200);
      expect(result.commissionFeePercent).toBe(10);
      expect(result.commissionFee).toBe(20);
      expect(result.totalYouReceive).toBe(180);
    });

    it('Given a rental with $300 total and 15% platform fee, When getRentalRequestById is called, Then commission is $45 and owner receives $255', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        mockRental({ totalAmount: 300, status: RentalStatus.CONFIRMED }),
      );
      configService.get.mockReturnValue(15);

      // when
      const result = await service.getRentalRequestById(RENTAL_ID);

      // then
      expect(result.commissionFee).toBe(45);
      expect(result.totalYouReceive).toBe(255);
    });

    it('Given a rental, When getRentalRequestById is called, Then the response includes listing and renter details', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(mockRental());

      // when
      const result = await service.getRentalRequestById(RENTAL_ID);

      // then
      expect(result.listing.id).toBe(LISTING_ID);
      expect(result.listing.title).toBe('Test Listing');
      expect(result.renter.id).toBe(RENTER_ID);
      expect(result.renter.email).toBe('john@test.com');
    });
  });

  // ─────────────────────────────────────────────
  // createPaymentIntent
  // ─────────────────────────────────────────────

  describe('createPaymentIntent', () => {
    it('Given rental does not exist, When createPaymentIntent is called, Then throws NotFoundException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(null);

      // when / then
      await expect(
        service.createPaymentIntent(RENTAL_ID, RENTER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('Given requesting user is not the renter, When createPaymentIntent is called, Then throws ForbiddenException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        mockRental({ renterId: 'another-user' }),
      );

      // when / then
      await expect(
        service.createPaymentIntent(RENTAL_ID, RENTER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Given rental is not in PENDING_PAYMENT status, When createPaymentIntent is called, Then throws BadRequestException', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        mockRental({ status: RentalStatus.CONFIRMED }),
      );

      // when / then
      await expect(
        service.createPaymentIntent(RENTAL_ID, RENTER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('Given owner has no Stripe account, When createPaymentIntent is called, Then throws BadRequestException mentioning Stripe onboarding', async () => {
      // given
      rentalRepo.findOne.mockResolvedValue(
        mockRental({
          listing: { user: { stripeAccountId: null } } as any,
        }),
      );

      // when / then
      await expect(
        service.createPaymentIntent(RENTAL_ID, RENTER_ID),
      ).rejects.toThrow('Owner has not completed Stripe onboarding');
    });

    it('Given all conditions are valid, When createPaymentIntent is called, Then calls Stripe with correct amount in cents and returns clientSecret', async () => {
      // given — rental con totalAmount=200 → 20000 centavos
      rentalRepo.findOne.mockResolvedValue(mockRental({ totalAmount: 200 }));
      configService.get.mockReturnValue(10);
      stripeService.createPaymentIntent.mockResolvedValue({
        client_secret: 'secret_xyz',
        id: 'pi_789',
      } as any);

      // when
      const result = await service.createPaymentIntent(RENTAL_ID, RENTER_ID);

      // then
      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith({
        amount: 20000,
        currency: 'usd',
        ownerStripeAccountId: 'acct_stripe',
        rentalId: RENTAL_ID,
        platformFeePercent: 10,
      });
      expect(result).toEqual({
        clientSecret: 'secret_xyz',
        paymentIntentId: 'pi_789',
      });
    });
  });

  // ─────────────────────────────────────────────
  // handleStripeWebhook
  // ─────────────────────────────────────────────

  describe('handleStripeWebhook', () => {
    const payload = Buffer.from('{}');
    const signature = 'sig_test';

    it('Given an invalid Stripe signature, When handleStripeWebhook is called, Then throws BadRequestException', async () => {
      // given
      (stripeService.constructWebhookEvent as jest.Mock).mockImplementation(
        () => {
          throw new Error('Invalid signature');
        },
      );

      // when / then
      await expect(
        service.handleStripeWebhook(payload, signature),
      ).rejects.toThrow(BadRequestException);
    });

    it('Given a payment_intent.succeeded event with rentalId, When handleStripeWebhook is called, Then calls confirmPayment with the rentalId and paymentIntentId', async () => {
      // given
      const event = {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_123', metadata: { rentalId: RENTAL_ID } },
        },
      };
      (stripeService.constructWebhookEvent as jest.Mock).mockReturnValue(event);
      const confirmSpy = jest
        .spyOn(service, 'confirmPayment')
        .mockResolvedValue({} as Rental);

      // when
      await service.handleStripeWebhook(payload, signature);

      // then
      expect(confirmSpy).toHaveBeenCalledWith(RENTAL_ID, 'pi_123');
    });

    it('Given a payment_intent.succeeded event without rentalId in metadata, When handleStripeWebhook is called, Then confirmPayment is not called', async () => {
      // given
      const event = {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_123', metadata: {} }, // sin rentalId
        },
      };
      (stripeService.constructWebhookEvent as jest.Mock).mockReturnValue(event);
      const confirmSpy = jest.spyOn(service, 'confirmPayment');

      // when
      await service.handleStripeWebhook(payload, signature);

      // then
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('Given a payment_intent.payment_failed event, When handleStripeWebhook is called, Then updates the rental status to EXPIRED', async () => {
      // given
      const event = {
        type: 'payment_intent.payment_failed',
        data: {
          object: { metadata: { rentalId: RENTAL_ID } },
        },
      };
      (stripeService.constructWebhookEvent as jest.Mock).mockReturnValue(event);
      rentalRepo.update.mockResolvedValue({} as any);

      // when
      await service.handleStripeWebhook(payload, signature);

      // then
      expect(rentalRepo.update).toHaveBeenCalledWith(
        { id: RENTAL_ID },
        { status: RentalStatus.EXPIRED },
      );
    });

    it('Given an unhandled event type, When handleStripeWebhook is called, Then it resolves without error', async () => {
      // given
      const event = {
        type: 'customer.subscription.updated', // evento no manejado
        data: { object: {} },
      };
      (stripeService.constructWebhookEvent as jest.Mock).mockReturnValue(event);

      // when / then — no debe lanzar
      await expect(
        service.handleStripeWebhook(payload, signature),
      ).resolves.not.toThrow();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Custom matcher — simplifica el mock de save() que preserva mutaciones
// ─────────────────────────────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Mock {
      mockSave(): Mock;
    }
  }
}

// Extiende jest.fn() con .mockSave() para que el passthrough sea explícito
Object.defineProperty(jest.fn().constructor.prototype, 'mockSave', {
  value: function () {
    return this.mockImplementation(async (entity: any) => ({ ...entity }));
  },
});
