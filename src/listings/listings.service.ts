import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { BagListing } from './entities/bag-listing.entity';
import { Club, ClubCategory } from './entities/club.entity';
import { ClubWoodDetail } from './entities/club-wood-detail.entity';
import { ClubHybridDetail } from './entities/club-hybrid-detail.entity';
import { ClubIronDetail } from './entities/club-iron-detail.entity';
import { ClubWedgeDetail } from './entities/club-wedge-detail.entity';
import { ClubPutterDetail } from './entities/club-putter-detail.entity';
import { CreateListingDto } from './dto/create-listing.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from 'src/common/interfaces/paginated-response.interface';
import { Favorite } from 'src/favorites/entities/favorite.entity';
import { ListingStatusFilter } from './dto/listing-pagination.dto';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(BagListing)
    private readonly listingRepository: Repository<BagListing>,
    @InjectRepository(Club)
    private readonly clubRepository: Repository<Club>,
    @InjectRepository(ClubWoodDetail)
    private readonly woodDetailRepository: Repository<ClubWoodDetail>,
    @InjectRepository(ClubHybridDetail)
    private readonly hybridDetailRepository: Repository<ClubHybridDetail>,
    @InjectRepository(ClubIronDetail)
    private readonly ironDetailRepository: Repository<ClubIronDetail>,
    @InjectRepository(ClubWedgeDetail)
    private readonly wedgeDetailRepository: Repository<ClubWedgeDetail>,
    @InjectRepository(ClubPutterDetail)
    private readonly putterDetailRepository: Repository<ClubPutterDetail>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
  ) {}

  // ─── Private helper: create clubs with their details ──────────────────────
  // Extracted to avoid duplication between createListing and updateListing.

  private async createClubsForListing(
    listingId: string,
    clubs: CreateListingDto['clubs'],
  ): Promise<void> {
    for (const [index, clubDto] of clubs.entries()) {
      const club = this.clubRepository.create({
        bagListingId: listingId,
        category: clubDto.category,
        brand: clubDto.brand,
        model: clubDto.model,
        flex: clubDto.flex,
        loft: clubDto.loft,
        shaftType: clubDto.shaftType || null,
        displayOrder: index,
      });

      const savedClub = await this.clubRepository.save(club);

      switch (clubDto.category) {
        case ClubCategory.WOOD:
          if (clubDto.woodDetail) {
            await this.woodDetailRepository.save(
              this.woodDetailRepository.create({
                clubId: savedClub.id,
                woodType: clubDto.woodDetail.woodType,
                quantity: clubDto.woodDetail.quantity || 1,
              }),
            );
          }
          break;

        case ClubCategory.HYBRID_RESCUE:
          if (clubDto.hybridDetail) {
            await this.hybridDetailRepository.save(
              this.hybridDetailRepository.create({
                clubId: savedClub.id,
                hybridNumber: clubDto.hybridDetail.hybridNumber,
                quantity: clubDto.hybridDetail.quantity || 1,
              }),
            );
          }
          break;

        case ClubCategory.IRON:
          if (clubDto.ironDetail) {
            await this.ironDetailRepository.save(
              this.ironDetailRepository.create({
                clubId: savedClub.id,
                ironNumber: clubDto.ironDetail.ironNumber,
                quantity: clubDto.ironDetail.quantity || 1,
              }),
            );
          }
          break;

        case ClubCategory.WEDGE:
          if (clubDto.wedgeDetail) {
            await this.wedgeDetailRepository.save(
              this.wedgeDetailRepository.create({
                clubId: savedClub.id,
                wedgeType: clubDto.wedgeDetail.wedgeType,
                quantity: clubDto.wedgeDetail.quantity || 1,
              }),
            );
          }
          break;

        case ClubCategory.PUTTER:
          if (clubDto.putterDetail) {
            await this.putterDetailRepository.save(
              this.putterDetailRepository.create({
                clubId: savedClub.id,
                putterTypes: clubDto.putterDetail.putterTypes,
              }),
            );
          }
          break;
      }
    }
  }

  // ─── Private helper: fetch listing with all club relations ────────────────

  private async findListingWithRelations(id: string): Promise<BagListing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: [
        'clubs',
        'clubs.woodDetail',
        'clubs.hybridDetail',
        'clubs.ironDetail',
        'clubs.wedgeDetail',
        'clubs.putterDetail',
      ],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return listing;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async createListing(
    userId: string,
    dto: CreateListingDto,
  ): Promise<BagListing> {
    const listing = this.listingRepository.create({
      userId,
      title: dto.title,
      description: dto.description || null,
      pricePerDay: dto.pricePerDay,
      gender: dto.gender,
      hand: dto.hand,
      street: dto.street || null,
      zipCode: dto.zipCode || null,
      state: dto.state || null,
      city: dto.city || null,
      photos: dto.photos || [],
      isPublished: true,
    });

    const savedListing = await this.listingRepository.save(listing);
    await this.createClubsForListing(savedListing.id, dto.clubs);
    return this.findListingWithRelations(savedListing.id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────
  // Clubs are deleted and recreated on every update — safe because rentals
  // reference the listing (listing_id), not individual clubs (no club_id FK).

  async updateListing(
    id: string,
    userId: string,
    dto: CreateListingDto,
  ): Promise<BagListing> {
    const listing = await this.listingRepository.findOne({
      where: { id, userId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Update listing fields — userId and isPublished are intentionally excluded
    Object.assign(listing, {
      title: dto.title,
      description: dto.description || null,
      pricePerDay: dto.pricePerDay,
      gender: dto.gender,
      hand: dto.hand,
      street: dto.street || null,
      zipCode: dto.zipCode || null,
      state: dto.state || null,
      city: dto.city || null,
      photos: dto.photos || [],
    });

    await this.listingRepository.save(listing);

    // Delete all existing clubs (cascade deletes their details via FK)
    // then recreate from the new DTO
    await this.clubRepository.delete({ bagListingId: id });
    await this.createClubsForListing(id, dto.clubs);

    return this.findListingWithRelations(id);
  }

  // ─── Find user listings ───────────────────────────────────────────────────

  async findUserListings(
    userId: string,
    paginationDto: PaginationDto,
    status?: ListingStatusFilter,
  ): Promise<PaginatedResponse<BagListing>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    if (status === ListingStatusFilter.RENTED) {
      const [listings, total] = await this.listingRepository
        .createQueryBuilder('listing')
        .innerJoin(
          'rentals',
          'rental',
          'rental.listing_id = listing.id AND rental.owner_id = :userId AND rental.status IN (:...rentalStatuses)',
          { userId, rentalStatuses: ['confirmed', 'active'] },
        )
        .leftJoinAndSelect('listing.clubs', 'clubs')
        .where('listing.userId = :userId', { userId })
        .orderBy('listing.createdAt', 'DESC')
        .take(limit)
        .skip(skip)
        .getManyAndCount();

      return createPaginatedResponse(listings, total, page, limit);
    }

    const where: FindOptionsWhere<BagListing> = { userId };

    if (status === ListingStatusFilter.ACTIVE) {
      where.isPublished = true;
      where.isActive = true;
    } else if (status === ListingStatusFilter.PAUSED) {
      where.isPublished = true;
      where.isActive = false;
    }

    const [listings, total] = await this.listingRepository.findAndCount({
      where,
      relations: ['clubs'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return createPaginatedResponse(listings, total, page, limit);
  }

  // ─── Find by ID ───────────────────────────────────────────────────────────

  async findById(
    id: string,
    userId?: string,
  ): Promise<BagListing & { isFavorite: boolean }> {
    const listing = await this.findListingWithRelations(id);

    let isFavorite = false;
    if (userId) {
      const favorite = await this.favoriteRepository.findOne({
        where: { userId, listingId: id },
      });
      isFavorite = !!favorite;
    }

    return { ...listing, isFavorite };
  }

  // ─── Find all published ───────────────────────────────────────────────────

  async findAllPublished(
    paginationDto: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<BagListing & { isFavorite: boolean }>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [listings, total] = await this.listingRepository.findAndCount({
      where: { isPublished: true, isActive: true },
      relations: ['clubs'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    let favoriteIds: Set<string> = new Set();
    if (userId) {
      const favorites = await this.favoriteRepository.find({
        where: { userId },
        select: ['listingId'],
      });
      favoriteIds = new Set(favorites.map((f) => f.listingId));
    }

    const listingsWithFavorite = listings.map((listing) => ({
      ...listing,
      isFavorite: favoriteIds.has(listing.id),
    }));

    return createPaginatedResponse(listingsWithFavorite, total, page, limit);
  }

  // ─── Toggle status ────────────────────────────────────────────────────────
  // isActive  → controls whether the listing appears in public search results
  // isPublished → marks that the listing was formally published (never toggled here)

  async toggleListingStatus(id: string, userId: string): Promise<BagListing> {
    const listing = await this.listingRepository.findOne({
      where: { id, userId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    listing.isActive = !listing.isActive;
    return this.listingRepository.save(listing);
  }
}
