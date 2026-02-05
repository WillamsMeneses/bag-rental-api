import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { BagListing } from './entities/bag-listing.entity';
import { Club } from './entities/club.entity';
import { ClubWoodDetail } from './entities/club-wood-detail.entity';
import { ClubHybridDetail } from './entities/club-hybrid-detail.entity';
import { ClubIronDetail } from './entities/club-iron-detail.entity';
import { ClubWedgeDetail } from './entities/club-wedge-detail.entity';
import { ClubPutterDetail } from './entities/club-putter-detail.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BagListing,
      Club,
      ClubWoodDetail,
      ClubHybridDetail,
      ClubIronDetail,
      ClubWedgeDetail,
      ClubPutterDetail,
    ]),
  ],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
