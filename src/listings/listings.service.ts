import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BagListing } from './entities/bag-listing.entity';
import { Club, ClubCategory } from './entities/club.entity';
import { ClubWoodDetail } from './entities/club-wood-detail.entity';
import { ClubHybridDetail } from './entities/club-hybrid-detail.entity';
import { ClubIronDetail } from './entities/club-iron-detail.entity';
import { ClubWedgeDetail } from './entities/club-wedge-detail.entity';
import { ClubPutterDetail } from './entities/club-putter-detail.entity';
import { CreateListingDto } from './dto/create-listing.dto';

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

  async findUserListings(userId: string): Promise<BagListing[]> {
    return this.listingRepository.find({
      where: { userId },
      relations: ['clubs'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<BagListing> {
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

  /**
   * Get all published listings (for dashboard/browse)
   */
  async findAllPublished(): Promise<BagListing[]> {
    return this.listingRepository.find({
      where: { isPublished: true, isActive: true },
      relations: ['clubs'],
      order: { createdAt: 'DESC' },
    });
  }
}
