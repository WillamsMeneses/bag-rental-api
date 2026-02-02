import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message?: string;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  timestamp!: string;

  @ApiProperty()
  path!: string;
}

export class PaginationDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  limit?: number = 10;
}

export class PaginatedResponseDto<T> {
  @ApiProperty()
  data!: T[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
