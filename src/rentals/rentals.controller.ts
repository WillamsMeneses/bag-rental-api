import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CancelRentalDto } from './dto/cancel-rental.dto';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';

@ApiTags('Rentals')
@ApiBearerAuth('JWT-auth')
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check availability for dates' })
  @ApiResponse({ status: 200, description: 'Availability checked' })
  async checkAvailability(@Body() dto: CheckAvailabilityDto) {
    return this.rentalsService.checkAvailability(dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a rental (15-min payment window)' })
  @ApiResponse({ status: 201, description: 'Rental created' })
  async createRental(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateRentalDto,
  ) {
    return this.rentalsService.createRental(user.id, dto);
  }

  @Patch(':id/confirm-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm payment (mock for now)' })
  @ApiResponse({ status: 200, description: 'Payment confirmed' })
  async confirmPayment(@Param('id') id: string) {
    return this.rentalsService.confirmPayment(id);
  }

  @Patch(':id/cancel-by-renter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel rental by renter (24hr refund)' })
  @ApiResponse({ status: 200, description: 'Rental cancelled' })
  async cancelByRenter(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: CancelRentalDto,
  ) {
    return this.rentalsService.cancelByRenter(user.id, id, dto);
  }

  @Patch(':id/cancel-by-owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel rental by owner (with penalty)' })
  @ApiResponse({ status: 200, description: 'Rental cancelled' })
  async cancelByOwner(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: CancelRentalDto,
  ) {
    return this.rentalsService.cancelByOwner(user.id, id, dto);
  }

  @Get('my-rentals')
  @ApiOperation({ summary: 'Get my rentals (as renter)' })
  @ApiResponse({ status: 200, description: 'Rentals retrieved' })
  async getMyRentals(@CurrentUser() user: CurrentUserData) {
    return this.rentalsService.getUserRentals(user.id);
  }

  @Get('owner-rentals')
  @ApiOperation({ summary: 'Get rentals for my listings (as owner)' })
  @ApiResponse({ status: 200, description: 'Rentals retrieved' })
  async getOwnerRentals(@CurrentUser() user: CurrentUserData) {
    return this.rentalsService.getOwnerRentals(user.id);
  }

  @Get('listings/:listingId/blocked-dates')
  @ApiOperation({ summary: 'Get blocked dates for a listing' })
  @ApiResponse({ status: 200, description: 'Blocked dates retrieved' })
  async getBlockedDates(@Param('listingId') listingId: string) {
    const dates = await this.rentalsService.getBlockedDates(listingId);
    return { blockedDates: dates };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rental by ID' })
  @ApiResponse({ status: 200, description: 'Rental retrieved' })
  async getRentalById(@Param('id') id: string) {
    return this.rentalsService.findById(id);
  }
}
