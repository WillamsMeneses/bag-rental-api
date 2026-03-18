import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingResponseDto } from './dto/listing-response.dto';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { OptionalJwtAuthGuard } from 'src/common/guards/optional-jwt.guard';
import {
  OptionalUser,
  OptionalUserData,
} from 'src/common/decorators/optional-auth.decorator';
import { ListingPaginationDto } from './dto/listing-pagination.dto';

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Get all published listings',
    description:
      'Public endpoint. If user is authenticated, isFavorite field will be populated.',
  })
  @ApiResponse({
    status: 200,
    description: 'All published listings retrieved',
    type: [ListingResponseDto],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllListings(
    @OptionalUser() user: OptionalUserData | null,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.listingsService.findAllPublished(paginationDto, user?.id);
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new bag listing' })
  @ApiResponse({
    status: 201,
    description: 'Listing created successfully',
    type: ListingResponseDto,
  })
  async createListing(
    @CurrentUser() user: CurrentUserData,
    @Body() createListingDto: CreateListingDto,
  ) {
    return this.listingsService.createListing(user.id, createListingDto);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('my-listings')
  @ApiOperation({ summary: 'Get current user listings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'paused', 'rented'],
  })
  async getMyListings(
    @CurrentUser() user: CurrentUserData,
    @Query() paginationDto: ListingPaginationDto,
  ) {
    return this.listingsService.findUserListings(
      user.id,
      paginationDto,
      paginationDto.status,
    );
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle listing active/paused status' })
  @ApiResponse({
    status: 200,
    description: 'Listing status toggled successfully',
    type: ListingResponseDto,
  })
  async toggleListingStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.listingsService.toggleListingStatus(id, user.id);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Update listing by ID' })
  @ApiResponse({
    status: 200,
    description: 'Listing updated successfully',
    type: ListingResponseDto,
  })
  async updateListing(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() updateListingDto: CreateListingDto,
  ) {
    return this.listingsService.updateListing(id, user.id, updateListingDto);
  }

  @ApiBearerAuth('JWT-auth')
  @Get(':id')
  @ApiOperation({ summary: 'Get listing by ID' })
  @ApiResponse({
    status: 200,
    description: 'Listing retrieved successfully',
    type: ListingResponseDto,
  })
  async getListingById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.listingsService.findById(id, user.id);
  }
}
