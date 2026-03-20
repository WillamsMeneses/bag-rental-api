import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    private readonly configService: ConfigService,
  ) {}

  // Crear PaymentIntent con transfer automático al owner
  async createPaymentIntent(params: {
    amount: number; // en centavos
    currency: string;
    ownerStripeAccountId: string;
    rentalId: string;
    platformFeePercent: number;
  }): Promise<Stripe.PaymentIntent> {
    const platformFee = Math.round(
      params.amount * (params.platformFeePercent / 100),
    );

    return this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      transfer_data: {
        destination: params.ownerStripeAccountId,
      },
      application_fee_amount: platformFee,
      metadata: {
        rentalId: params.rentalId,
      },
    });
  }

  async createCheckoutSession(params: {
    amount: number;
    currency: string;
    ownerStripeAccountId: string;
    rentalId: string;
    platformFee: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: params.currency,
            product_data: { name: 'Bag Rental' },
            unit_amount: params.amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_data: { destination: params.ownerStripeAccountId },
        application_fee_amount: params.platformFee,
        metadata: { rentalId: params.rentalId },
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
  }

  // Construir evento del webhook
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret!,
    );
  }

  // Crear cuenta Connect para owner (onboarding)
  async createConnectAccount(email: string): Promise<Stripe.Account> {
    return this.stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
  }

  // Generar link de onboarding para el owner
  async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<Stripe.AccountLink> {
    return this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
  }
}
