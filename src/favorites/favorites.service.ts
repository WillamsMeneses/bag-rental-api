import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { BagListing } from '../listings/entities/bag-listing.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(BagListing)
    private readonly listingRepository: Repository<BagListing>,
  ) {}

  /**
   * Toggle favorite (add or remove)
   */
  async toggleFavorite(
    userId: string,
    listingId: string,
  ): Promise<{ isFavorited: boolean }> {
    // Verificar que el listing existe
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Buscar si ya existe el favorito
    const existingFavorite = await this.favoriteRepository.findOne({
      where: { userId, listingId },
    });

    if (existingFavorite) {
      // Si existe, eliminarlo (unfavorite)
      await this.favoriteRepository.remove(existingFavorite);
      return { isFavorited: false };
    } else {
      // Si no existe, crearlo (favorite)
      const favorite = this.favoriteRepository.create({
        userId,
        listingId,
      });
      await this.favoriteRepository.save(favorite);
      return { isFavorited: true };
    }
  }

  /**
   * Get all favorites for a user with listing details
   */
  async getUserFavorites(userId: string): Promise<BagListing[]> {
    const favorites = await this.favoriteRepository.find({
      where: { userId },
      relations: ['listing', 'listing.clubs'],
      order: { createdAt: 'DESC' },
    });

    return favorites.map((fav) => fav.listing);
  }

  /**
   * Check if a listing is favorited by user
   */
  async isFavorited(userId: string, listingId: string): Promise<boolean> {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, listingId },
    });

    return !!favorite;
  }

  /**
   * Get favorite IDs for a user (useful for bulk checks)
   */
  async getUserFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.favoriteRepository.find({
      where: { userId },
      select: ['listingId'],
    });

    return favorites.map((fav) => fav.listingId);
  }
}
