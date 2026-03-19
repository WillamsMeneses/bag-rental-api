import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';

@Module({
  imports: [ConfigModule],
  providers: [
    StripeService,
    {
      provide: 'STRIPE_CLIENT',
      useFactory: (configService: ConfigService): Stripe => {
        return new Stripe(configService.get<string>('STRIPE_SECRET_KEY')!, {
          apiVersion: '2026-02-25.clover',
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [StripeService],
})
export class StripeModule {}
