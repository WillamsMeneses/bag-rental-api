import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';

@ApiTags('Favorites')
@ApiBearerAuth('JWT-auth')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':listingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle favorite on a listing' })
  @ApiResponse({ status: 200, description: 'Favorite toggled successfully' })
  async toggleFavorite(
    @CurrentUser() user: CurrentUserData,
    @Param('listingId') listingId: string,
  ) {
    return this.favoritesService.toggleFavorite(user.id, listingId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user favorites' })
  @ApiResponse({ status: 200, description: 'Favorites retrieved successfully' })
  async getUserFavorites(@CurrentUser() user: CurrentUserData) {
    return this.favoritesService.getUserFavorites(user.id);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Get favorite listing IDs' })
  @ApiResponse({ status: 200, description: 'Favorite IDs retrieved' })
  async getFavoriteIds(@CurrentUser() user: CurrentUserData) {
    const ids = await this.favoritesService.getUserFavoriteIds(user.id);
    return { favoriteIds: ids };
  }
}
