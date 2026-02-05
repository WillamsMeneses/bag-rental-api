import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// import {
//   UserGender,
//   HandType,
// } from '../entities/bag-listing.entity';
// import {
//   ClubCategory,
//   ClubFlex,
//   ShaftType,
// } from '../entities/club.entity';
import { HandType, UserGender } from '../entities/bag-listing.entity';
import { ClubCategory, ClubFlex, ShaftType } from '../entities/club.entity';

// DTOs para detalles específicos de clubs
class ClubWoodDetailDto {
  @ApiProperty({ example: '3' })
  @IsString()
  @IsNotEmpty()
  woodType!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;
}

class ClubHybridDetailDto {
  @ApiProperty({ example: '3' })
  @IsString()
  @IsNotEmpty()
  hybridNumber!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;
}

class ClubIronDetailDto {
  @ApiProperty({ example: '7' })
  @IsString()
  @IsNotEmpty()
  ironNumber!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;
}

class ClubWedgeDetailDto {
  @ApiProperty({ example: 'pitching' })
  @IsString()
  @IsNotEmpty()
  wedgeType!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;
}

class ClubPutterDetailDto {
  @ApiProperty({ example: 'blade' })
  @IsString()
  @IsNotEmpty()
  putterType!: string;
}

// DTO principal para un club
class CreateClubDto {
  @ApiProperty({ enum: ClubCategory, example: ClubCategory.DRIVER })
  @IsEnum(ClubCategory)
  category!: ClubCategory;

  @ApiProperty({ example: 'Cobra' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand!: string;

  @ApiProperty({ example: 'King F9' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @ApiProperty({ enum: ClubFlex, example: ClubFlex.STIFF })
  @IsEnum(ClubFlex)
  flex!: ClubFlex;

  @ApiProperty({ example: 10.5 })
  @IsNumber()
  @Min(0)
  loft!: number;

  @ApiPropertyOptional({ enum: ShaftType, example: ShaftType.STEEL })
  @IsEnum(ShaftType)
  @IsOptional()
  shaftType?: ShaftType;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ClubWoodDetailDto)
  woodDetail?: ClubWoodDetailDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ClubHybridDetailDto)
  hybridDetail?: ClubHybridDetailDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ClubIronDetailDto)
  ironDetail?: ClubIronDetailDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ClubWedgeDetailDto)
  wedgeDetail?: ClubWedgeDetailDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ClubPutterDetailDto)
  putterDetail?: ClubPutterDetailDto;
}

// DTO principal para crear listing
export class CreateListingDto {
  @ApiProperty({ example: 'King F9 Complete Set' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ example: 'Full set in excellent condition' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 25.0 })
  @IsNumber()
  @Min(0.01)
  pricePerDay!: number;

  @ApiProperty({ enum: UserGender, example: UserGender.MALE })
  @IsEnum(UserGender)
  gender!: UserGender;

  @ApiProperty({ enum: HandType, example: HandType.LEFT_HANDED })
  @IsEnum(HandType)
  hand!: HandType;

  @ApiPropertyOptional({ example: '56th Street' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({ example: '90001' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  zipCode?: string;

  @ApiPropertyOptional({ example: 'California' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'Los Angeles' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ type: [String], example: [] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  photos?: string[];

  @ApiProperty({ type: [CreateClubDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateClubDto)
  clubs!: CreateClubDto[];
}

export {
  CreateClubDto,
  ClubWoodDetailDto,
  ClubHybridDetailDto,
  ClubIronDetailDto,
  ClubWedgeDetailDto,
  ClubPutterDetailDto,
};
