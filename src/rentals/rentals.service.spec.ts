/* eslint-disable @typescript-eslint/no-explicit-any */

import { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RentalsService } from './rentals.service';
import { AuthService } from '../auth/auth.service';
import { Rental, RentalStatus } from './entities/rental.entity';
import { BagListing } from '../listings/entities/bag-listing.entity';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { createTestingApp } from 'test/helper/create-test-app';

// IDs reales de la DB de test — se populan en beforeAll via login
let RENTER_ID: string;
let OWNER_ID: string;
const LISTING_ID = 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2';

// Fechas dinámicas: mañana y pasado mañana (no se puede rentar hoy)
function getFutureDates(daysFromNow = 1, durationDays = 4) {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    durationDays,
  };
}

describe('RentalsService (integration)', () => {
  let module: TestingModule;
  let service: RentalsService;
  let authService: AuthService;
  let dataSource: DataSource;
  let rentalRepo: Repository<Rental>;

  beforeAll(async () => {
    module = await createTestingApp();
    service = module.get(RentalsService);
    authService = module.get(AuthService);
    dataSource = module.get(DataSource);
    rentalRepo = module.get(getRepositoryToken(Rental));

    // Solo limpiar rentals, no tocar users ni listings
    await dataSource.query('TRUNCATE TABLE rentals CASCADE');

    // Login para obtener IDs reales
    const renterLogin = await authService.login({
      email: 'test@example2.com',
      password: 'Password123@',
    });
    RENTER_ID = renterLogin.user.id;

    const ownerLogin = await authService.login({
      email: 'test@example3.com',
      password: 'Password123@',
    });
    OWNER_ID = ownerLogin.user.id;

    // Verificar que el listing existe, si no crearlo
    const listingRepo = module.get(getRepositoryToken(BagListing));
    const existing = await listingRepo.findOne({ where: { id: LISTING_ID } });
    if (!existing) {
      await listingRepo.save({
        id: LISTING_ID,
        userId: OWNER_ID,
        pricePerDay: 50,
        title: 'Titleist Set',
        description: 'Nice clubs',
        hand: 'right',
        gender: 'unisex',
        city: 'Buenos Aires',
        state: 'BA',
      });
    }
  });
  beforeEach(async () => {
    // Esperar un tick para que las notificaciones fire-and-forget terminen
    await new Promise((resolve) => setTimeout(resolve, 100));

    await dataSource.query('DELETE FROM notifications');
    await dataSource.query('DELETE FROM rentals');
  });
  afterAll(async () => {
    await module.close();
  });

  // Helper
  async function seedRental(overrides: Partial<Rental> = {}): Promise<Rental> {
    const { startDate, endDate } = getFutureDates();
    return rentalRepo.save(
      rentalRepo.create({
        listingId: LISTING_ID,
        renterId: RENTER_ID,
        ownerId: OWNER_ID,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays: 4,
        pricePerDay: 50,
        totalAmount: 200,
        status: RentalStatus.PENDING_PAYMENT,
        paymentStatus: 'pending',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        ...overrides,
      }),
    );
  }

  // ─── checkAvailability ───────────────────────────────────────────────────

  describe('checkAvailability', () => {
    it('dado que endDate es anterior a startDate, lanza BadRequestException', async () => {
      await expect(
        service.checkAvailability({
          listingId: LISTING_ID,
          startDate: '2026-05-05',
          endDate: '2026-05-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dado que no hay rentas superpuestas, retorna available: true', async () => {
      const { startDate, endDate } = getFutureDates(30); // fechas lejanas, sin conflicto
      const result = await service.checkAvailability({
        listingId: LISTING_ID,
        startDate,
        endDate,
      });
      expect(result.available).toBe(true);
    });

    it('dado que hay rentas superpuestas, retorna available: false con blockedDates', async () => {
      const { startDate, endDate } = getFutureDates();
      await seedRental({
        status: RentalStatus.CONFIRMED,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      const result = await service.checkAvailability({
        listingId: LISTING_ID,
        startDate,
        endDate,
      });
      expect(result.available).toBe(false);
      expect(result.blockedDates).toBeDefined();
    });
  });

  // ─── createRental ────────────────────────────────────────────────────────

  describe('createRental', () => {
    it('dado que el listing no existe, lanza NotFoundException', async () => {
      const { startDate, endDate } = getFutureDates();
      await expect(
        service.createRental(RENTER_ID, {
          listingId: '00000000-0000-0000-0000-000000000000',
          startDate,
          endDate,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('dado que el renter es el dueño del listing, lanza BadRequestException', async () => {
      const { startDate, endDate } = getFutureDates();
      await expect(
        service.createRental(OWNER_ID, {
          listingId: LISTING_ID,
          startDate,
          endDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dado fechas disponibles, crea la renta con pricing correcto y estado PENDING_PAYMENT', async () => {
      const { startDate, endDate, durationDays } = getFutureDates(1, 4);
      const result = await service.createRental(RENTER_ID, {
        listingId: LISTING_ID,
        startDate,
        endDate,
      });

      expect(result.status).toBe(RentalStatus.PENDING_PAYMENT);
      expect(result.totalDays).toBe(durationDays);
      expect(result.renterId).toBe(RENTER_ID);
      expect(result.ownerId).toBe(OWNER_ID);
    });

    it('dado una nueva renta, expiresAt es ~15 minutos desde ahora', async () => {
      const { startDate, endDate } = getFutureDates();
      const result = await service.createRental(RENTER_ID, {
        listingId: LISTING_ID,
        startDate,
        endDate,
      });

      const diffMinutes =
        (result.expiresAt.getTime() - Date.now()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThan(14);
      expect(diffMinutes).toBeLessThan(16);
    });
  });

  // ─── confirmPayment ──────────────────────────────────────────────────────

  describe('confirmPayment', () => {
    it('dado que la renta no existe, lanza NotFoundException', async () => {
      await expect(
        service.confirmPayment('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });

    it('dado que la renta no está en PENDING_PAYMENT, lanza BadRequestException', async () => {
      const rental = await seedRental({ status: RentalStatus.CONFIRMED });
      await expect(service.confirmPayment(rental.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('dado una renta PENDING_PAYMENT, transiciona a CONFIRMED', async () => {
      const rental = await seedRental();
      const result = await service.confirmPayment(rental.id, 'pi_123');

      expect(result.status).toBe(RentalStatus.CONFIRMED);
      expect(result.paymentStatus).toBe('paid');
      expect(result.paymentIntentId).toBe('pi_123');
      expect(result.paidAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeNull();
    });
  });

  // ─── cancelByRenter ──────────────────────────────────────────────────────

  describe('cancelByRenter', () => {
    it('dado que la renta no existe, lanza NotFoundException', async () => {
      await expect(
        service.cancelByRenter(
          RENTER_ID,
          '00000000-0000-0000-0000-000000000000',
          {},
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('dado que el usuario no es el renter, lanza ForbiddenException', async () => {
      const rental = await seedRental({ status: RentalStatus.CONFIRMED });
      await expect(
        service.cancelByRenter(OWNER_ID, rental.id, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('dado una renta CONFIRMED creada hace menos de 24hs, reembolsa el total', async () => {
      const rental = await seedRental({
        status: RentalStatus.CONFIRMED,
        totalAmount: 200,
        createdAt: new Date(),
      });

      const result = await service.cancelByRenter(RENTER_ID, rental.id, {
        reason: 'Plans changed',
      });

      expect(result.status).toBe(RentalStatus.CANCELLED_BY_RENTER);
      expect(Number(result.refundAmount)).toBe(200);
      expect(result.cancellationReason).toBe('Plans changed');
    });

    it('dado una renta creada hace más de 24hs, no emite reembolso', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const rental = await seedRental({
        status: RentalStatus.CONFIRMED,
        totalAmount: 200,
        createdAt: oldDate,
      });

      const result = await service.cancelByRenter(RENTER_ID, rental.id, {});

      expect(result.status).toBe(RentalStatus.CANCELLED_BY_RENTER);
      expect(Number(result.refundAmount)).toBe(0);
    });
  });

  // ─── getBlockedDates ─────────────────────────────────────────────────────

  describe('getBlockedDates', () => {
    it('dado que no hay rentas activas, retorna array vacío', async () => {
      const result = await service.getBlockedDates(LISTING_ID);
      expect(result).toEqual([]);
    });

    it('dado una renta de 4 días, retorna cada fecha individual', async () => {
      await seedRental({
        startDate: '2027-06-01' as any,
        endDate: '2027-06-04' as any,
        status: RentalStatus.CONFIRMED,
      });

      const result = await service.getBlockedDates(LISTING_ID);

      expect(result).toContain('2027-06-01');
      expect(result).toContain('2027-06-04');
      expect(result).toHaveLength(4);
    });
  });
});
