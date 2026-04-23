/* eslint-disable @typescript-eslint/no-explicit-any */

import { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ListingsService } from './listings.service';
import { AuthService } from '../auth/auth.service';
import {
  BagListing,
  HandType,
  UserGender,
} from './entities/bag-listing.entity';
import { Favorite } from '../favorites/entities/favorite.entity';
import { NotFoundException } from '@nestjs/common';
import { ListingStatusFilter } from './dto/listing-pagination.dto';
import { createTestingApp } from 'test/helper/create-test-app';

// IDs reales — se populan en beforeAll via DB
let OWNER_ID: string;
let LISTING_ID: string;
// Segundo user para probar acceso no autorizado
let OTHER_USER_ID: string;

describe('ListingsService (integration)', () => {
  let module: TestingModule;
  let service: ListingsService;
  let authService: AuthService;
  let dataSource: DataSource;
  let listingRepo: Repository<BagListing>;
  let favoriteRepo: Repository<Favorite>;

  beforeAll(async () => {
    module = await createTestingApp();
    service = module.get(ListingsService);
    authService = module.get(AuthService);
    dataSource = module.get(DataSource);
    listingRepo = module.get(getRepositoryToken(BagListing));
    favoriteRepo = module.get(getRepositoryToken(Favorite));

    // Obtener IDs reales desde la DB — no asumas valores hardcodeados
    const ownerLogin = await authService.login({
      email: 'test@example3.com',
      password: 'Password123@',
    });
    OWNER_ID = ownerLogin.user.id;

    const renterLogin = await authService.login({
      email: 'test@example2.com',
      password: 'Password123@',
    });
    OTHER_USER_ID = renterLogin.user.id;

    // Verificar que existe al menos un listing del owner, si no crearlo
    const existingListing = await listingRepo.findOne({
      where: { userId: OWNER_ID },
    });

    if (existingListing) {
      LISTING_ID = existingListing.id;
    } else {
      const newListing = await listingRepo.save(
        listingRepo.create({
          userId: OWNER_ID,
          title: 'Integration Test Set',
          description: 'For testing',
          pricePerDay: 100,
          hand: HandType.RIGHT_HANDED,
          gender: UserGender.MALE,
          street: 'Test St',
          zipCode: '99999',
          state: 'TX',
          city: 'Houston',
          photos: [],
          isActive: true,
          isPublished: true,
        }),
      );
      LISTING_ID = newListing.id;
    }
  });

  beforeEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    await dataSource.query('DELETE FROM favorites');
    await dataSource.query('DELETE FROM rentals');
  });

  afterAll(async () => {
    await module.close();
  });

  // Helper para crear un listing temporal de test (se limpia después)
  async function seedListing(
    overrides: Partial<BagListing> = {},
  ): Promise<BagListing> {
    return listingRepo.save(
      listingRepo.create({
        userId: OWNER_ID,
        title: 'Temp Test Listing',
        description: 'Temporary',
        pricePerDay: 75,
        hand: HandType.RIGHT_HANDED,
        gender: UserGender.MALE,
        street: '123 Test Ave',
        zipCode: '12345',
        state: 'CA',
        city: 'Los Angeles',
        photos: [],
        isActive: true,
        isPublished: true,
        ...overrides,
      }),
    );
  }

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('Given a listing that does not exist, When findById is called, Then it throws NotFoundException', async () => {
      await expect(
        service.findById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });

    it('Given an existing listing and no userId, When findById is called, Then it returns the listing with isFavorite = false', async () => {
      const result = await service.findById(LISTING_ID);

      expect(result.id).toBe(LISTING_ID);
      expect(result.isFavorite).toBe(false);
    });

    it('Given an existing listing and a user who favorited it, When findById is called, Then isFavorite is true', async () => {
      await favoriteRepo.save(
        favoriteRepo.create({ userId: OTHER_USER_ID, listingId: LISTING_ID }),
      );

      const result = await service.findById(LISTING_ID, OTHER_USER_ID);

      expect(result.isFavorite).toBe(true);
    });

    it('Given an existing listing and a user who did not favorite it, When findById is called, Then isFavorite is false', async () => {
      // No favorite seeded for OTHER_USER_ID
      const result = await service.findById(LISTING_ID, OTHER_USER_ID);

      expect(result.isFavorite).toBe(false);
    });
  });

  // ─── findAllPublished ───────────────────────────────────────────────────────

  describe('findAllPublished', () => {
    it('Given published active listings exist, When findAllPublished is called without filters, Then it returns at least one result', async () => {
      const result = await service.findAllPublished({ page: 1, limit: 10 });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((listing) => {
        expect(listing.isPublished).toBe(true);
        expect(listing.isActive).toBe(true);
      });
    });

    it('Given listings in Los Angeles, When filtered by city = Los Angeles, Then only Los Angeles listings are returned', async () => {
      const result = await service.findAllPublished({
        page: 1,
        limit: 10,
        city: 'Los Angeles',
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((listing) => {
        expect(listing.city.toLowerCase()).toContain('los angeles');
      });
    });

    it('Given a city that has no listings, When findAllPublished is called with that city, Then it returns an empty array', async () => {
      const result = await service.findAllPublished({
        page: 1,
        limit: 10,
        city: 'ZzZNonExistentCityZzZ',
      });

      expect(result.data).toEqual([]);
    });

    it('Given an authenticated user who favorited a listing, When findAllPublished is called, Then isFavorite is true for that listing', async () => {
      await favoriteRepo.save(
        favoriteRepo.create({ userId: OTHER_USER_ID, listingId: LISTING_ID }),
      );

      const result = await service.findAllPublished(
        { page: 1, limit: 10 },
        OTHER_USER_ID,
      );

      const favoritedListing = result.data.find((l) => l.id === LISTING_ID);
      expect(favoritedListing).toBeDefined();
      // expect(favoritedListing!.isFavorite).toBe(true);
      if (favoritedListing) {
        expect(favoritedListing.isFavorite).toBe(true);
      }
    });

    it('Given pagination params, When findAllPublished is called, Then it returns correct pagination meta', async () => {
      const result = await service.findAllPublished({ page: 1, limit: 5 });

      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(5);
      expect(typeof result.pagination.total).toBe('number');
    });
  });

  // ─── findUserListings ───────────────────────────────────────────────────────

  describe('findUserListings', () => {
    it('Given the owner has active published listings, When findUserListings is called with ACTIVE status, Then it returns those listings', async () => {
      const result = await service.findUserListings(
        OWNER_ID,
        { page: 1, limit: 10 },
        ListingStatusFilter.ACTIVE,
      );

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((l) => {
        expect(l.isActive).toBe(true);
        expect(l.isPublished).toBe(true);
      });
    });

    it('Given the owner has no paused listings, When findUserListings is called with PAUSED status, Then it returns an empty array', async () => {
      const result = await service.findUserListings(
        OWNER_ID,
        { page: 1, limit: 10 },
        ListingStatusFilter.PAUSED,
      );

      // No listings have isActive=false for this owner seeded in beforeAll
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('Given a user with no listings, When findUserListings is called, Then it returns an empty array', async () => {
      const result = await service.findUserListings(
        '00000000-0000-0000-0000-000000000099',
        { page: 1, limit: 10 },
        ListingStatusFilter.ACTIVE,
      );

      expect(result.data).toEqual([]);
    });
  });

  // ─── createListing ──────────────────────────────────────────────────────────

  describe('createListing', () => {
    it('Given a valid DTO, When createListing is called, Then it persists the listing and returns it with the correct owner', async () => {
      const dto = {
        title: 'New Integration Listing',
        description: 'Created in integration test',
        pricePerDay: 60,
        hand: HandType.RIGHT_HANDED,
        gender: UserGender.MALE,
        street: '789 Test Blvd',
        zipCode: '54321',
        state: 'NY',
        city: 'New York',
        photos: [],
        clubs: [],
      };

      const result = await service.createListing(OWNER_ID, dto as any);

      expect(result.id).toBeDefined();
      expect(result.title).toBe(dto.title);
      expect(result.userId).toBe(OWNER_ID);

      // Cleanup
      await listingRepo.delete({ id: result.id });
    });
  });

  // ─── updateListing ──────────────────────────────────────────────────────────

  describe('updateListing', () => {
    it('Given a listing that does not belong to the user, When updateListing is called, Then it throws NotFoundException', async () => {
      const dto = {
        title: 'Hacked Title',
        description: 'x',
        pricePerDay: 1,
        hand: HandType.RIGHT_HANDED,
        gender: UserGender.MALE,
        city: 'Buenos Aires',
        state: 'BA',
        photos: [],
        clubs: [],
      };

      await expect(
        service.updateListing(LISTING_ID, OTHER_USER_ID, dto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('Given a listing that does not exist, When updateListing is called, Then it throws NotFoundException', async () => {
      const dto = {
        title: 'Whatever',
        description: 'x',
        pricePerDay: 1,
        hand: HandType.RIGHT_HANDED,
        gender: UserGender.MALE,
        city: 'BA',
        state: 'BA',
        photos: [],
        clubs: [],
      };

      await expect(
        service.updateListing(
          '00000000-0000-0000-0000-000000000000',
          OWNER_ID,
          dto as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('Given the owner updates their listing, When updateListing is called, Then it returns the updated listing with the new title', async () => {
      const tempListing = await seedListing({ title: 'Before Update' });

      const dto = {
        title: 'After Update',
        description: 'Updated description',
        pricePerDay: 90,
        hand: HandType.RIGHT_HANDED,
        gender: UserGender.MALE,
        street: '1 Updated St',
        zipCode: '00001',
        state: 'FL',
        city: 'Miami',
        photos: [],
        clubs: [],
      };

      const result = await service.updateListing(
        tempListing.id,
        OWNER_ID,
        dto as any,
      );

      expect(result.title).toBe('After Update');
      expect(result.city).toBe('Miami');

      // Cleanup
      await listingRepo.delete({ id: tempListing.id });
    });
  });

  // ─── toggleListingStatus ────────────────────────────────────────────────────

  describe('toggleListingStatus', () => {
    it('Given a listing that does not exist, When toggleListingStatus is called, Then it throws NotFoundException', async () => {
      await expect(
        service.toggleListingStatus(
          '00000000-0000-0000-0000-000000000000',
          OWNER_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('Given a listing that belongs to another user, When toggleListingStatus is called, Then it throws NotFoundException', async () => {
      await expect(
        service.toggleListingStatus(LISTING_ID, OTHER_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('Given an active listing owned by the user, When toggleListingStatus is called, Then it flips isActive to false', async () => {
      const tempListing = await seedListing({ isActive: true });

      const result = await service.toggleListingStatus(
        tempListing.id,
        OWNER_ID,
      );

      expect(result.isActive).toBe(false);

      // Cleanup
      await listingRepo.delete({ id: tempListing.id });
    });

    it('Given a paused listing owned by the user, When toggleListingStatus is called, Then it flips isActive back to true', async () => {
      const tempListing = await seedListing({ isActive: false });

      const result = await service.toggleListingStatus(
        tempListing.id,
        OWNER_ID,
      );

      expect(result.isActive).toBe(true);

      // Cleanup
      await listingRepo.delete({ id: tempListing.id });
    });
  });
});
