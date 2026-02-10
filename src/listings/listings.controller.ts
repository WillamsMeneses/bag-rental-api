import {
  Controller,
  Post,
  Get,
  Body,
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
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingResponseDto } from './dto/listing-response.dto';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';

@ApiTags('Listings')
@ApiBearerAuth('JWT-auth')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

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

  @Get('my-listings')
  @ApiOperation({ summary: 'Get current user listings' })
  @ApiResponse({
    status: 200,
    description: 'User listings retrieved successfully',
    type: [ListingResponseDto],
  })
  async getMyListings(@CurrentUser() user: CurrentUserData) {
    return this.listingsService.findUserListings(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get listing by ID' })
  @ApiResponse({
    status: 200,
    description: 'Listing retrieved successfully',
    type: ListingResponseDto,
  })
  async getListingById(@Param('id') id: string) {
    return this.listingsService.findById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all published listings' })
  @ApiResponse({
    status: 200,
    description: 'All published listings retrieved',
    type: [ListingResponseDto],
  })
  async getAllListings() {
    return this.listingsService.findAllPublished();
  }
}
