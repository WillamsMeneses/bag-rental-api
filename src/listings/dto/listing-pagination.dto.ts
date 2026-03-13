import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

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
}
