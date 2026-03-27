import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RentalsService } from '../../rentals/rentals.service';

@Injectable()
export class RentalExpirationTask {
  private readonly logger = new Logger(RentalExpirationTask.name);

  constructor(private readonly rentalsService: RentalsService) {}

  /**
   * Runs every minute to expire pending payments
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleRentalStatuses() {
    this.logger.debug('Updating rental statuses...');
    try {
      await this.rentalsService.expirePendingPayments();
      await this.rentalsService.activateConfirmedRentals();
      await this.rentalsService.completeActiveRentals();
    } catch (error) {
      this.logger.error('Error updating rental statuses:', error);
    }
  }
}
