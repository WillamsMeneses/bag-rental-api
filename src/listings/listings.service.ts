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

  async createListing(
    userId: string,
    createListingDto: CreateListingDto,
  ): Promise<BagListing> {
    // 1. Crear el listing principal
    const listing = this.listingRepository.create({
      userId,
      title: createListingDto.title,
      description: createListingDto.description || null,
      pricePerDay: createListingDto.pricePerDay,
      gender: createListingDto.gender,
      hand: createListingDto.hand,
      street: createListingDto.street || null,
      zipCode: createListingDto.zipCode || null,
      state: createListingDto.state || null,
      city: createListingDto.city || null,
      photos: createListingDto.photos || [],
      isPublished: true,
    });

    const savedListing = await this.listingRepository.save(listing);

    // 2. Crear los clubs con sus detalles
    for (const [index, clubDto] of createListingDto.clubs.entries()) {
      const club = this.clubRepository.create({
        bagListingId: savedListing.id,
        category: clubDto.category,
        brand: clubDto.brand,
        model: clubDto.model,
        flex: clubDto.flex,
        loft: clubDto.loft,
        shaftType: clubDto.shaftType || null,
        displayOrder: index,
      });

      const savedClub = await this.clubRepository.save(club);

      // Crear detalles específicos según categoría
      switch (clubDto.category) {
        case ClubCategory.WOOD:
          if (clubDto.woodDetail) {
            const woodDetail = this.woodDetailRepository.create({
              clubId: savedClub.id,
              woodType: clubDto.woodDetail.woodType,
              quantity: clubDto.woodDetail.quantity || 1,
            });
            await this.woodDetailRepository.save(woodDetail);
          }
          break;

        case ClubCategory.HYBRID_RESCUE:
          if (clubDto.hybridDetail) {
            const hybridDetail = this.hybridDetailRepository.create({
              clubId: savedClub.id,
              hybridNumber: clubDto.hybridDetail.hybridNumber,
              quantity: clubDto.hybridDetail.quantity || 1,
            });
            await this.hybridDetailRepository.save(hybridDetail);
          }
          break;

        case ClubCategory.IRON:
          if (clubDto.ironDetail) {
            const ironDetail = this.ironDetailRepository.create({
              clubId: savedClub.id,
              ironNumber: clubDto.ironDetail.ironNumber,
              quantity: clubDto.ironDetail.quantity || 1,
            });
            await this.ironDetailRepository.save(ironDetail);
          }
          break;

        case ClubCategory.WEDGE:
          if (clubDto.wedgeDetail) {
            const wedgeDetail = this.wedgeDetailRepository.create({
              clubId: savedClub.id,
              wedgeType: clubDto.wedgeDetail.wedgeType,
              quantity: clubDto.wedgeDetail.quantity || 1,
            });
            await this.wedgeDetailRepository.save(wedgeDetail);
          }
          break;

        case ClubCategory.PUTTER:
          if (clubDto.putterDetail) {
            const putterDetail = this.putterDetailRepository.create({
              clubId: savedClub.id,
              putterType: clubDto.putterDetail.putterType,
            });
            await this.putterDetailRepository.save(putterDetail);
          }
          break;
      }
    }

    // 3. Retornar el listing completo con todas las relaciones
    const completeListing = await this.listingRepository.findOne({
      where: { id: savedListing.id },
      relations: [
        'clubs',
        'clubs.woodDetail',
        'clubs.hybridDetail',
        'clubs.ironDetail',
        'clubs.wedgeDetail',
        'clubs.putterDetail',
      ],
    });

    if (!completeListing) {
      throw new NotFoundException('Listing not found after creation');
    }

    return completeListing;
  }

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

  /**
   * Find listing by ID with isFavorite
   */
  async findById(
    id: string,
    userId?: string,
  ): Promise<BagListing & { isFavorite: boolean }> {
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

    // Check if favorited
    let isFavorite = false;
    if (userId) {
      const favorite = await this.favoriteRepository.findOne({
        where: { userId, listingId: id },
      });
      isFavorite = !!favorite;
    }

    return {
      ...listing,
      isFavorite,
    };
  }

  /**
   * Get all published listings with pagination and optional isFavorite
   */
  async findAllPublished(
    paginationDto: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<BagListing & { isFavorite: boolean }>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    // Get listings with pagination
    const [listings, total] = await this.listingRepository.findAndCount({
      where: { isPublished: true, isActive: true },
      relations: ['clubs'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    // Get favorite IDs if user is logged in
    let favoriteIds: Set<string> = new Set();
    if (userId) {
      const favorites = await this.favoriteRepository.find({
        where: { userId },
        select: ['listingId'],
      });
      favoriteIds = new Set(favorites.map((f) => f.listingId));
    }

    // Add isFavorite field to each listing
    const listingsWithFavorite = listings.map((listing) => ({
      ...listing,
      isFavorite: favoriteIds.has(listing.id),
    }));

    return createPaginatedResponse(listingsWithFavorite, total, page, limit);
  }

  /**
   * Toggle listing visibility between active and paused.
   * Only the listing owner can toggle their own listings.
   *
   * isActive  → controls whether the listing appears in public search results
   * isPublished → marks that the listing was formally published (never toggled here)
   */
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
