import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ClubCategory } from '../entities/club.entity';

export enum ListingStatusFilter {
  ACTIVE = 'active',
  PAUSED = 'paused',
  RENTED = 'rented',
}

export class ListingPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ListingStatusFilter })
  @IsOptional()
  @IsEnum(ListingStatusFilter)
  status?: ListingStatusFilter;

  @ApiPropertyOptional({ example: 'Los Angeles' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: ClubCategory })
  @IsOptional()
  @IsEnum(ClubCategory)
  clubCategory?: ClubCategory;
}
