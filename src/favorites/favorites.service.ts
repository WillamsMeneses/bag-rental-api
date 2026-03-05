import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { BagListing } from '../listings/entities/bag-listing.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  PaginatedResponse,
  createPaginatedResponse,
} from '../common/interfaces/paginated-response.interface';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(BagListing)
    private readonly listingRepository: Repository<BagListing>,
  ) {}

  /**
   * Toggle favorite
   */
  async toggleFavorite(
    userId: string,
    listingId: string,
  ): Promise<{ isFavorited: boolean }> {
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const existingFavorite = await this.favoriteRepository.findOne({
      where: { userId, listingId },
    });

    if (existingFavorite) {
      await this.favoriteRepository.remove(existingFavorite);
      return { isFavorited: false };
    } else {
      const favorite = this.favoriteRepository.create({
        userId,
        listingId,
      });
      await this.favoriteRepository.save(favorite);
      return { isFavorited: true };
    }
  }

  /**
   * Get user favorites WITH PAGINATION
   */
  async getUserFavorites(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<BagListing & { isFavorite: boolean }>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [favorites, total] = await this.favoriteRepository.findAndCount({
      where: { userId },
      relations: ['listing', 'listing.clubs'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    // Todos son favoritos (obviamente, están en la tabla favorites)
    const listingsWithFavorite = favorites.map((fav) => ({
      ...fav.listing,
      isFavorite: true,
    }));

    return createPaginatedResponse(listingsWithFavorite, total, page, limit);
  }
}
