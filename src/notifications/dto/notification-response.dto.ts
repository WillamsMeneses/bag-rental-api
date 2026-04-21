// src/notifications/dto/notification-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

export class NotificationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ nullable: true }) rentalId!: string | null;
  @ApiProperty({ enum: NotificationType }) type!: NotificationType;
  @ApiProperty() title!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ nullable: true }) metadata!: Record<string, unknown> | null;
  @ApiProperty() isRead!: boolean;
  @ApiProperty({ nullable: true }) readAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}
