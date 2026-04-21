import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';
import { NotificationPaginationDto } from './dto/notification-pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications (paginated)' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  async getMyNotifications(
    @CurrentUser() user: CurrentUserData,
    @Query() paginationDto: NotificationPaginationDto,
  ) {
    return this.notificationsService.getUserNotifications(
      user.id,
      paginationDto,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification detail (auto marks as read)' })
  @ApiResponse({ status: 200, description: 'Notification detail retrieved' })
  async getNotificationById(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    // return this.notificationsService.getNotificationById(user.id, id);
    await this.notificationsService.markAsRead(user.id, id);
    return { success: true };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }
}
