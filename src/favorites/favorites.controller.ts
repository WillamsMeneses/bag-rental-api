import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

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
  @ApiOperation({ summary: 'Get all user favorites with pagination' })
  @ApiResponse({ status: 200, description: 'Favorites retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserFavorites(
    @CurrentUser() user: CurrentUserData,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.favoritesService.getUserFavorites(user.id, paginationDto);
  }
}
