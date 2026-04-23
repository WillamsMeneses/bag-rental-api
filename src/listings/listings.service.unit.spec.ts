/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingsService } from './listings.service';
import {
  BagListing,
  UserGender,
  HandType,
} from './entities/bag-listing.entity';
import {
  Club,
  ClubCategory,
  ClubFlex,
  ShaftType,
} from './entities/club.entity';
import { ClubWoodDetail } from './entities/club-wood-detail.entity';
import { ClubHybridDetail } from './entities/club-hybrid-detail.entity';
import { ClubIronDetail } from './entities/club-iron-detail.entity';
import { ClubWedgeDetail } from './entities/club-wedge-detail.entity';
import { ClubPutterDetail } from './entities/club-putter-detail.entity';
import { Favorite } from '../favorites/entities/favorite.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { NotFoundException } from '@nestjs/common';
import { ListingStatusFilter } from './dto/listing-pagination.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Factories
// ─────────────────────────────────────────────────────────────────────────────

const USER_ID = 'user-123';
const LISTING_ID = 'listing-123';

function mockListing(overrides: Partial<BagListing> = {}): BagListing {
  return {
    id: LISTING_ID,
    userId: USER_ID,
    title: 'Test Listing',
    description: 'Test Description',
    pricePerDay: 50,
    gender: UserGender.MALE,
    hand: HandType.RIGHT_HANDED,
    street: '123 Main St',
    zipCode: '12345',
    state: 'CA',
    city: 'Los Angeles',
    photos: ['photo1.jpg'],
    isActive: true,
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: USER_ID, stripeAccountId: 'acct_123' } as any,
    clubs: [],
    ...overrides,
  };
}

function mockClub(overrides: Partial<Club> = {}): Club {
  return {
    id: 'club-123',
    bagListingId: LISTING_ID,
    category: ClubCategory.DRIVER,
    brand: 'Titleist',
    model: 'TSi3',
    flex: ClubFlex.STIFF,
    loft: 9.5,
    shaftType: ShaftType.GRAPHITE,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    bagListing: null as any,
    woodDetail: null,
    hybridDetail: null,
    ironDetail: null,
    wedgeDetail: null,
    putterDetail: null,
    ...overrides,
  };
}

function mockCreateListingDto(
  overrides: Partial<CreateListingDto> = {},
): CreateListingDto {
  return {
    title: 'New Set',
    description: 'Great clubs',
    pricePerDay: 75,
    gender: UserGender.MALE,
    hand: HandType.RIGHT_HANDED,
    street: '456 Oak Ave',
    zipCode: '90210',
    state: 'CA',
    city: 'Beverly Hills',
    photos: ['photo2.jpg'],
    clubs: [
      {
        category: ClubCategory.DRIVER,
        brand: 'Callaway',
        model: 'Epic',
        flex: ClubFlex.REGULAR,
        loft: 10.5,
        shaftType: ShaftType.GRAPHITE,
      },
    ],
    ...overrides,
  };
}

function makeQueryBuilder(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    ...overrides,
  };
}

describe('ListingsService (unit)', () => {
  let service: ListingsService;
  let listingRepo: jest.Mocked<Partial<Repository<BagListing>>>;
  let clubRepo: jest.Mocked<Partial<Repository<Club>>>;
  let woodDetailRepo: jest.Mocked<Partial<Repository<ClubWoodDetail>>>;
  let hybridDetailRepo: jest.Mocked<Partial<Repository<ClubHybridDetail>>>;
  let ironDetailRepo: jest.Mocked<Partial<Repository<ClubIronDetail>>>;
  let wedgeDetailRepo: jest.Mocked<Partial<Repository<ClubWedgeDetail>>>;
  let putterDetailRepo: jest.Mocked<Partial<Repository<ClubPutterDetail>>>;
  let favoriteRepo: jest.Mocked<Partial<Repository<Favorite>>>;
  let cloudinaryService: jest.Mocked<Partial<CloudinaryService>>;

  beforeEach(async () => {
    listingRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder()) as any,
      delete: jest.fn(),
    };
    clubRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    woodDetailRepo = { create: jest.fn(), save: jest.fn() };
    hybridDetailRepo = { create: jest.fn(), save: jest.fn() };
    ironDetailRepo = { create: jest.fn(), save: jest.fn() };
    wedgeDetailRepo = { create: jest.fn(), save: jest.fn() };
    putterDetailRepo = { create: jest.fn(), save: jest.fn() };
    favoriteRepo = { findOne: jest.fn(), find: jest.fn() };
    cloudinaryService = { deleteImages: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingsService,
        { provide: getRepositoryToken(BagListing), useValue: listingRepo },
        { provide: getRepositoryToken(Club), useValue: clubRepo },
        {
          provide: getRepositoryToken(ClubWoodDetail),
          useValue: woodDetailRepo,
        },
        {
          provide: getRepositoryToken(ClubHybridDetail),
          useValue: hybridDetailRepo,
        },
        {
          provide: getRepositoryToken(ClubIronDetail),
          useValue: ironDetailRepo,
        },
        {
          provide: getRepositoryToken(ClubWedgeDetail),
          useValue: wedgeDetailRepo,
        },
        {
          provide: getRepositoryToken(ClubPutterDetail),
          useValue: putterDetailRepo,
        },
        { provide: getRepositoryToken(Favorite), useValue: favoriteRepo },
        { provide: CloudinaryService, useValue: cloudinaryService },
      ],
    }).compile();

    service = module.get(ListingsService);
  });

  // ─────────────────────────────────────────────
  // createListing
  // ─────────────────────────────────────────────
  describe('createListing', () => {
    it('Given valid DTO, When createListing, Then saves listing and clubs and returns listing with relations', async () => {
      const dto = mockCreateListingDto();
      const listingWithNewId = mockListing({ id: 'new-id', title: dto.title });
      listingRepo.create.mockReturnValue(listingWithNewId);
      listingRepo.save.mockResolvedValue(listingWithNewId);
      clubRepo.create.mockReturnValue(mockClub());
      clubRepo.save.mockResolvedValue(mockClub());
      woodDetailRepo.create.mockReturnValue({} as any);
      woodDetailRepo.save.mockResolvedValue({} as any);

      // Simular la llamada a findListingWithRelations después de guardar clubs
      const finalListing = { ...listingWithNewId, clubs: [mockClub()] };
      listingRepo.findOne.mockResolvedValue(finalListing);

      const result = await service.createListing(USER_ID, dto);

      expect(listingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, title: dto.title }),
      );
      expect(listingRepo.save).toHaveBeenCalled();
      expect(clubRepo.create).toHaveBeenCalled();
      expect(result.clubs).toHaveLength(1);
      expect(result.id).toBe('new-id');
      expect(result.title).toBe(dto.title);
    });
  });

  // ─────────────────────────────────────────────
  // updateListing
  // ─────────────────────────────────────────────
  describe('updateListing', () => {
    it('Given listing exists and belongs to user, When updateListing, Then updates listing, deletes old clubs, creates new clubs, and deletes removed photos from Cloudinary', async () => {
      const existingListing = mockListing({ photos: ['old1.jpg', 'old2.jpg'] });
      listingRepo.findOne.mockResolvedValueOnce(existingListing); // para la búsqueda inicial

      const updatedListing = {
        ...existingListing,
        ...mockCreateListingDto(),
        clubs: [],
      };
      listingRepo.save.mockResolvedValue(updatedListing);
      clubRepo.delete.mockResolvedValue({} as any);
      clubRepo.create.mockReturnValue(mockClub());
      clubRepo.save.mockResolvedValue(mockClub());

      // Simular la llamada a findListingWithRelations después de actualizar
      const finalListing = { ...updatedListing, clubs: [mockClub()] };
      listingRepo.findOne.mockResolvedValueOnce(finalListing); // para la segunda llamada (findListingWithRelations)

      const dto = mockCreateListingDto({ photos: ['new1.jpg'] });
      const result = await service.updateListing(LISTING_ID, USER_ID, dto);

      expect(cloudinaryService.deleteImages).toHaveBeenCalledWith([
        'old1.jpg',
        'old2.jpg',
      ]);
      expect(clubRepo.delete).toHaveBeenCalledWith({
        bagListingId: LISTING_ID,
      });
      expect(listingRepo.save).toHaveBeenCalled();
      expect(result.title).toBe(dto.title);
    });

    it('Given listing does not exist, When updateListing, Then throws NotFoundException', async () => {
      listingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateListing(LISTING_ID, USER_ID, mockCreateListingDto()),
      ).rejects.toThrow(NotFoundException);
    });

    it('Given listing belongs to another user, When updateListing, Then throws NotFoundException', async () => {
      // La consulta real de TypeORM incluye { id, userId } → debe devolver null
      listingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateListing(LISTING_ID, USER_ID, mockCreateListingDto()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────
  // findUserListings
  // ─────────────────────────────────────────────
  describe('findUserListings', () => {
    it('Given status = ACTIVE, When findUserListings, Then returns only active published listings', async () => {
      const listings = [mockListing()];
      listingRepo.findAndCount.mockResolvedValue([listings, 1]);

      const result = await service.findUserListings(
        USER_ID,
        { page: 1, limit: 10 },
        ListingStatusFilter.ACTIVE,
      );

      expect(listingRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, isPublished: true, isActive: true },
          relations: ['clubs'],
        }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('Given status = PAUSED, When findUserListings, Then returns inactive but published listings', async () => {
      listingRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findUserListings(
        USER_ID,
        { page: 1, limit: 10 },
        ListingStatusFilter.PAUSED,
      );
      expect(listingRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, isPublished: true, isActive: false },
        }),
      );
    });

    it('Given status = RENTED, When findUserListings, Then uses QueryBuilder to join rentals', async () => {
      const qb = makeQueryBuilder({
        getManyAndCount: jest.fn().mockResolvedValue([[mockListing()], 1]),
      });
      (listingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.findUserListings(
        USER_ID,
        { page: 1, limit: 10 },
        ListingStatusFilter.RENTED,
      );
      expect(qb.innerJoin).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────
  // findById
  // ─────────────────────────────────────────────
  describe('findById', () => {
    it('Given listing exists and no userId provided, When findById, Then returns listing with isFavorite = false', async () => {
      const listing = mockListing();
      listingRepo.findOne.mockResolvedValue(listing);
      const result = await service.findById(LISTING_ID);
      expect(result.id).toBe(LISTING_ID);
      expect(result.isFavorite).toBe(false);
    });

    it('Given listing exists and userId provided with favorite, When findById, Then returns isFavorite = true', async () => {
      const listing = mockListing();
      listingRepo.findOne.mockResolvedValue(listing);
      favoriteRepo.findOne.mockResolvedValue({ id: 'fav-1' } as Favorite);
      const result = await service.findById(LISTING_ID, USER_ID);
      expect(result.isFavorite).toBe(true);
    });

    it('Given listing does not exist, When findById, Then throws NotFoundException', async () => {
      listingRepo.findOne.mockResolvedValue(null);
      await expect(service.findById(LISTING_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─────────────────────────────────────────────
  // findAllPublished
  // ─────────────────────────────────────────────
  describe('findAllPublished', () => {
    it('Given no filters, When findAllPublished, Then returns published active listings', async () => {
      const listings = [mockListing()];
      const qb = makeQueryBuilder({
        getManyAndCount: jest.fn().mockResolvedValue([listings, 1]),
      });
      (listingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.findAllPublished({ page: 1, limit: 10 });
      expect(qb.where).toHaveBeenCalledWith(
        'listing.isPublished = true AND listing.isActive = true',
      );
      expect(result.data).toHaveLength(1);
    });

    it('Given city filter, When findAllPublished, Then adds city condition (preserves original case)', async () => {
      const qb = makeQueryBuilder();
      (listingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      await service.findAllPublished({
        page: 1,
        limit: 10,
        city: 'Los Angeles',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'LOWER(listing.city) LIKE LOWER(:city)',
        { city: '%Los Angeles%' }, // el servicio pasa el valor original sin lower
      );
    });

    it('Given authenticated user, When findAllPublished, Then populates isFavorite correctly', async () => {
      const listings = [mockListing()];
      const qb = makeQueryBuilder({
        getManyAndCount: jest.fn().mockResolvedValue([listings, 1]),
      });
      (listingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      favoriteRepo.find.mockResolvedValue([
        { listingId: LISTING_ID },
      ] as Favorite[]);

      const result = await service.findAllPublished(
        { page: 1, limit: 10 },
        USER_ID,
      );
      expect(result.data[0].isFavorite).toBe(true);
    });
  });

  // ─────────────────────────────────────────────
  // toggleListingStatus
  // ─────────────────────────────────────────────
  describe('toggleListingStatus', () => {
    it('Given listing exists and belongs to user, When toggleListingStatus, Then flips isActive', async () => {
      const listing = mockListing({ isActive: true });
      listingRepo.findOne.mockResolvedValue(listing);
      listingRepo.save.mockResolvedValue({ ...listing, isActive: false });
      const result = await service.toggleListingStatus(LISTING_ID, USER_ID);
      expect(result.isActive).toBe(false);
    });

    it('Given listing does not exist, When toggleListingStatus, Then throws NotFoundException', async () => {
      listingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.toggleListingStatus(LISTING_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('Given listing belongs to another user, When toggleListingStatus, Then throws NotFoundException', async () => {
      listingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.toggleListingStatus(LISTING_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
