import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { Rental, RentalStatus } from '../rentals/entities/rental.entity';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from 'src/common/interfaces/paginated-response.interface';
import { NotificationPaginationDto } from './dto/notification-pagination.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Rental)
    private readonly rentalRepository: Repository<Rental>,
  ) {}

  // ─── Factory ──────────────────────────────────────────────────────────────

  private async createNotification(params: {
    userId: string;
    rentalId: string | null;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: params.userId,
      rentalId: params.rentalId,
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: params.metadata ?? null,
      isRead: false,
      readAt: null,
    });
    return this.notificationRepository.save(notification);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private toDateString(date: Date | string): string {
    return typeof date === 'string' ? date : date.toISOString().split('T')[0];
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  async notifyRentalConfirmed(rental: Rental): Promise<void> {
    const startDate = this.toDateString(rental.startDate);
    const endDate = this.toDateString(rental.endDate);

    await this.createNotification({
      userId: rental.ownerId,
      rentalId: rental.id,
      type: NotificationType.RENTAL_CONFIRMED,
      title: 'Your bag has been rented!',
      message: `Your bag was rented from ${startDate} to ${endDate}. Payment was successfully processed.`,
      metadata: {
        rentalId: rental.id,
        listingId: rental.listingId,
        startDate,
        endDate,
        totalAmount: rental.totalAmount,
        totalDays: rental.totalDays,
      },
    });
  }

  async notifyRentalCancelledByRenter(rental: Rental): Promise<void> {
    const startDate = this.toDateString(rental.startDate);

    await this.createNotification({
      userId: rental.ownerId,
      rentalId: rental.id,
      type: NotificationType.RENTAL_CANCELLED_BY_RENTER,
      title: 'Rental cancelled by renter',
      message: `The rental of your bag (${startDate}) was cancelled by the renter.`,
      metadata: {
        rentalId: rental.id,
        listingId: rental.listingId,
        startDate,
        refundAmount: rental.refundAmount,
      },
    });
  }

  async notifyRentalCancelledByOwner(rental: Rental): Promise<void> {
    const startDate = this.toDateString(rental.startDate);

    await this.createNotification({
      userId: rental.renterId,
      rentalId: rental.id,
      type: NotificationType.RENTAL_CANCELLED_BY_OWNER,
      title: 'Your rental was cancelled by the owner',
      message: `Sorry, the owner cancelled your rental scheduled for ${startDate}. You will receive a full refund.`,
      metadata: {
        rentalId: rental.id,
        listingId: rental.listingId,
        startDate,
        refundAmount: rental.refundAmount,
      },
    });
  }

  // ─── Get notifications (paginated) ────────────────────────────────────────

  async getUserNotifications(
    userId: string,
    paginationDto: NotificationPaginationDto,
  ): Promise<PaginatedResponse<Notification>> {
    const { page = 1, limit = 20, isRead } = paginationDto;
    const skip = (page - 1) * limit;

    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.rental', 'rental')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .take(limit)
      .skip(skip);

    if (isRead !== undefined) {
      qb.andWhere('notification.isRead = :isRead', { isRead });
    }

    const [notifications, total] = await qb.getManyAndCount();
    return createPaginatedResponse(notifications, total, page, limit);
  }

  // ─── Get notification by ID (full detail for the notification screen) ─────
  // Returns: notification + rental + listing + renter + owner
  // Also computes: commissionFee, totalYouReceive for the owner view

  async getNotificationById(
    userId: string,
    notificationId: string,
  ): Promise<Record<string, unknown>> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: [
        'rental',
        'rental.listing',
        'rental.listing.clubs',
        'rental.renter',
        'rental.owner',
      ],
    });

    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId)
      throw new ForbiddenException('Not authorized');

    // Auto mark as read
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }

    const rental = notification.rental;

    // Build detail response matching the UI
    const detail: Record<string, unknown> = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };

    if (rental) {
      const totalAmount = Number(rental.totalAmount);
      const commissionFeePercent = 5;
      const commissionFee = +(
        totalAmount *
        (commissionFeePercent / 100)
      ).toFixed(2);
      const totalYouReceive = +(totalAmount - commissionFee).toFixed(2);

      detail['rental'] = {
        id: rental.id,
        status: rental.status,
        startDate: this.toDateString(rental.startDate),
        endDate: this.toDateString(rental.endDate),
        totalDays: rental.totalDays,
        pricePerDay: rental.pricePerDay,
        totalAmount,
        commissionFee,
        commissionFeePercent,
        totalYouReceive,
        canDeny: rental.status === RentalStatus.CONFIRMED,
      };

      if (rental.listing) {
        detail['listing'] = {
          id: rental.listing.id,
          title: rental.listing.title,
          description: rental.listing.description,
          photos: rental.listing.photos,
          hand: rental.listing.hand,
          gender: rental.listing.gender,
          city: rental.listing.city,
          state: rental.listing.state,
          clubs: rental.listing.clubs,
        };
      }

      if (rental.renter) {
        detail['renter'] = {
          id: rental.renter.id,
          firstName: rental.renter.firstName,
          lastName: rental.renter.lastName,
          email: rental.renter.email,
          avatarUrl: rental.renter.avatarUrl,
          country: rental.renter.country,
        };
      }
    }

    return detail;
  }

  // ─── Mark one as read ─────────────────────────────────────────────────────

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId)
      throw new ForbiddenException('Not authorized');

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }

    return notification;
  }

  // ─── Mark all as read ─────────────────────────────────────────────────────

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND isRead = false', { userId })
      .execute();

    return { updated: result.affected ?? 0 };
  }

  // ─── Unread count ─────────────────────────────────────────────────────────

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { count };
  }
}
