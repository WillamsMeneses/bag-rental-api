import { ApiProperty } from '@nestjs/swagger';

export class ListingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  pricePerDay!: number;

  @ApiProperty()
  gender!: string;

  @ApiProperty()
  hand!: string;

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
