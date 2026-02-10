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
  async handleExpiration() {
    this.logger.debug('Checking for expired rentals...');
    try {
      await this.rentalsService.expirePendingPayments();
      this.logger.debug('Expired rentals processed');
    } catch (error) {
      this.logger.error('Error expiring rentals:', error);
    }
  }
}
