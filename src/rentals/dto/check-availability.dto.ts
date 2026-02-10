import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsNotEmpty } from 'class-validator';

export class CheckAvailabilityDto {
  @ApiProperty({ example: 'uuid-of-listing' })
  @IsUUID()
  @IsNotEmpty()
  listingId!: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ example: '2026-03-05' })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;
}
