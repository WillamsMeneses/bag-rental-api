import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';
import { Rental } from './entities/rental.entity';
import { BagListing } from '../listings/entities/bag-listing.entity';
import { RentalExpirationTask } from 'src/common/tasks/rental-expiration.task';
import { StripeModule } from 'src/stripe/stripe.module';

@Module({
  imports: [TypeOrmModule.forFeature([Rental, BagListing]), StripeModule],
  controllers: [RentalsController],
  providers: [RentalsService, RentalExpirationTask],
  exports: [RentalsService],
})
export class RentalsModule {}
