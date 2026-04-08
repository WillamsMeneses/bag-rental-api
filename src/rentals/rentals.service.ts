import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Rental, RentalStatus } from './entities/rental.entity';
import { BagListing } from '../listings/entities/bag-listing.entity';
import { CreateRentalDto } from './dto/create-rental.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CancelRentalDto } from './dto/cancel-rental.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from 'src/common/interfaces/paginated-response.interface';
import Stripe from 'stripe';
import { StripeService } from 'src/stripe/stripe.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RentalsService {
  constructor(
    @InjectRepository(Rental)
    private readonly rentalRepository: Repository<Rental>,
    @InjectRepository(BagListing)
    private readonly listingRepository: Repository<BagListing>,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check availability for a listing in a date range
   */
  async checkAvailability(
    dto: CheckAvailabilityDto,
  ): Promise<{ available: boolean; blockedDates?: string[] }> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Validar que startDate < endDate
    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Buscar rentals que se solapen con las fechas solicitadas
    const overlappingRentals = await this.rentalRepository
      .createQueryBuilder('rental')
      .where('rental.listing_id = :listingId', { listingId: dto.listingId })
      .andWhere('rental.status IN (:...statuses)', {
        statuses: [
          RentalStatus.PENDING_PAYMENT,
          RentalStatus.CONFIRMED,
          RentalStatus.ACTIVE,
        ],
      })
      .andWhere(
        '(rental.start_date, rental.end_date) OVERLAPS (:startDate, :endDate)',
        {
          startDate: dto.startDate,
          endDate: dto.endDate,
        },
      )
      .getMany();

    if (overlappingRentals.length > 0) {
      // TypeORM devuelve Date como string cuando usa QueryBuilder
      // Si startDate ya es string, úsalo directamente
      // Si es Date object, conviértelo
      const blockedDates = overlappingRentals.map((r) => {
        const start =
          typeof r.startDate === 'string'
            ? r.startDate
            : r.startDate.toISOString().split('T')[0];
        const end =
          typeof r.endDate === 'string'
            ? r.endDate
            : r.endDate.toISOString().split('T')[0];
        return `${start} to ${end}`;
      });
      return { available: false, blockedDates };
    }

    return { available: true };
  }

  /**
   * Create a rental (with 15-min payment window)
   */
  async createRental(
    userId: string,
    createRentalDto: CreateRentalDto,
  ): Promise<Rental> {
    // 1. Verificar que el listing existe
    const listing = await this.listingRepository.findOne({
      where: { id: createRentalDto.listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // 2. Verificar que el usuario no es el dueño
    if (listing.userId === userId) {
      throw new BadRequestException('You cannot rent your own listing');
    }

    // 3. Verificar disponibilidad
    const availability = await this.checkAvailability({
      listingId: createRentalDto.listingId,
      startDate: createRentalDto.startDate,
      endDate: createRentalDto.endDate,
    });

    if (!availability.available) {
      throw new BadRequestException('Dates are not available');
    }

    // 4. Calcular días y precio
    const startDate = new Date(createRentalDto.startDate);
    const endDate = new Date(createRentalDto.endDate);
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalAmount = Number(listing.pricePerDay) * totalDays;

    // 5. Crear rental con estado pending_payment
    // Expira en 15 minutos
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const rental = this.rentalRepository.create({
      listingId: createRentalDto.listingId,
      renterId: userId,
      ownerId: listing.userId,
      startDate: createRentalDto.startDate,
      endDate: createRentalDto.endDate,
      totalDays,
      pricePerDay: listing.pricePerDay,
      totalAmount,
      status: RentalStatus.PENDING_PAYMENT,
      expiresAt,
    });

    return this.rentalRepository.save(rental);
  }

  /**
   * Confirm payment - called from Stripe webhook on payment_intent.succeeded
   */
  async confirmPayment(
    rentalId: string,
    paymentIntentId?: string,
  ): Promise<Rental> {
    const rental = await this.rentalRepository.findOne({
      where: { id: rentalId },
    });

    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    if (rental.status !== RentalStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Rental is not pending payment');
    }

    rental.status = RentalStatus.CONFIRMED;
    rental.paymentStatus = 'paid';
    rental.paymentIntentId = paymentIntentId || null;
    rental.paidAt = new Date();
    rental.expiresAt = null;

    return this.rentalRepository.save(rental);
  }

  /**
   * Transition CONFIRMED rentals to ACTIVE when start date is reached
   */
  async activateConfirmedRentals(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.rentalRepository
      .createQueryBuilder()
      .update(Rental)
      .set({ status: RentalStatus.ACTIVE })
      .where('status = :status', { status: RentalStatus.CONFIRMED })
      .andWhere('start_date <= :today', { today })
      .execute();
  }

  /**
   * Transition ACTIVE rentals to COMPLETED when end date has passed
   */
  async completeActiveRentals(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.rentalRepository
      .createQueryBuilder()
      .update(Rental)
      .set({ status: RentalStatus.COMPLETED })
      .where('status = :status', { status: RentalStatus.ACTIVE })
      .andWhere('end_date < :today', { today })
      .execute();
  }

  /**
   * Cancel rental by renter (24hr window for full refund)
   */
  async cancelByRenter(
    userId: string,
    rentalId: string,
    cancelDto: CancelRentalDto,
  ): Promise<Rental> {
    const rental = await this.rentalRepository.findOne({
      where: { id: rentalId },
      relations: ['listing'],
    });

    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    if (rental.renterId !== userId) {
      throw new ForbiddenException('Not authorized to cancel this rental');
    }

    if (
      ![RentalStatus.CONFIRMED, RentalStatus.PENDING_PAYMENT].includes(
        rental.status,
      )
    ) {
      throw new BadRequestException('Cannot cancel this rental');
    }

    // Verificar ventana de 24 horas para reembolso completo
    const now = new Date();
    const hoursSinceCreation =
      (now.getTime() - rental.createdAt.getTime()) / (1000 * 60 * 60);

    let refundAmount = 0;
    if (hoursSinceCreation <= 24) {
      refundAmount = Number(rental.totalAmount);
    }

    rental.status = RentalStatus.CANCELLED_BY_RENTER;
    rental.cancelledAt = new Date();
    rental.cancelledBy = userId;
    rental.cancellationReason = cancelDto.reason || null;
    rental.refundAmount = refundAmount;
    rental.refundedAt = refundAmount > 0 ? new Date() : null;

    return this.rentalRepository.save(rental);
  }

  /**
   * Cancel rental by owner (con penalización)
   */
  async cancelByOwner(
    userId: string,
    rentalId: string,
    cancelDto: CancelRentalDto,
  ): Promise<Rental> {
    const rental = await this.rentalRepository.findOne({
      where: { id: rentalId },
      relations: ['listing'],
    });

    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    if (rental.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to cancel this rental');
    }

    if (
      ![RentalStatus.CONFIRMED, RentalStatus.ACTIVE].includes(rental.status)
    ) {
      throw new BadRequestException('Cannot cancel this rental');
    }

    rental.status = RentalStatus.CANCELLED_BY_OWNER;
    rental.cancelledAt = new Date();
    rental.cancelledBy = userId;
    rental.cancellationReason = cancelDto.reason || null;
    rental.refundAmount = Number(rental.totalAmount); // Reembolso completo
    rental.refundedAt = new Date();

    return this.rentalRepository.save(rental);
  }

  /**
   * Get user rentals (as renter) WITH PAGINATION
   */
  async getUserRentals(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<Rental>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [rentals, total] = await this.rentalRepository.findAndCount({
      where: { renterId: userId, status: Not(RentalStatus.EXPIRED) },
      relations: ['listing', 'owner'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return createPaginatedResponse(rentals, total, page, limit);
  }

  /**
   * Get owner rentals (as owner) WITH PAGINATION
   */
  async getOwnerRentals(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<Rental>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [rentals, total] = await this.rentalRepository.findAndCount({
      where: { ownerId: userId, status: Not(RentalStatus.EXPIRED) },
      relations: ['listing', 'renter'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return createPaginatedResponse(rentals, total, page, limit);
  }

  /**
   * Get rental by ID
   */
  async findById(id: string): Promise<Rental> {
    const rental = await this.rentalRepository.findOne({
      where: { id },
      relations: ['listing', 'renter', 'owner'],
    });

    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    return rental;
  }

  /**
   * Get blocked dates for a listing (for calendar)
   */
  async getBlockedDates(listingId: string): Promise<string[]> {
    const rentals = await this.rentalRepository.find({
      where: {
        listingId,
        status: In([
          RentalStatus.PENDING_PAYMENT,
          RentalStatus.CONFIRMED,
          RentalStatus.ACTIVE,
        ]),
      },
      select: ['startDate', 'endDate'],
    });

    // Convertir a array de fechas individuales
    const blockedDates: string[] = [];
    rentals.forEach((rental) => {
      // Manejar tanto Date objects como strings
      const startDate =
        typeof rental.startDate === 'string'
          ? new Date(rental.startDate)
          : rental.startDate;
      const endDate =
        typeof rental.endDate === 'string'
          ? new Date(rental.endDate)
          : rental.endDate;

      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        blockedDates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });

    return [...new Set(blockedDates)]; // Remove duplicates
  }

  /**
   * Expire PENDING_PAYMENT rentals that have passed their payment window
   */
  async expirePendingPayments(): Promise<void> {
    const now = new Date();

    await this.rentalRepository
      .createQueryBuilder()
      .update(Rental)
      .set({ status: RentalStatus.EXPIRED })
      .where('status = :status', { status: RentalStatus.PENDING_PAYMENT })
      .andWhere('expires_at < :now', { now })
      .execute();
  }

  async createPaymentIntent(
    rentalId: string,
    userId: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const rental = await this.rentalRepository.findOne({
      where: { id: rentalId },
      relations: ['listing', 'listing.user'],
    });

    if (!rental) throw new NotFoundException('Rental not found');
    if (rental.renterId !== userId)
      throw new ForbiddenException('Not authorized');
    if (rental.status !== RentalStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Rental is not pending payment');
    }

    const owner = rental.listing.user; // necesitamos stripeAccountId del owner
    if (!owner?.stripeAccountId) {
      throw new BadRequestException(
        'Owner has not completed Stripe onboarding',
      );
    }

    const platformFeePercent =
      this.configService.get<number>('STRIPE_PLATFORM_FEE_PERCENT') ?? 10;
    const amountInCents = Math.round(Number(rental.totalAmount) * 100);

    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: amountInCents,
      currency: 'usd',
      ownerStripeAccountId: owner.stripeAccountId,
      rentalId: rental.id,
      platformFeePercent,
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  async createCheckoutSession(
    rentalId: string,
    userId: string,
  ): Promise<{ url: string }> {
    const rental = await this.rentalRepository.findOne({
      where: { id: rentalId },
      relations: ['listing', 'listing.user'],
    });

    if (!rental) throw new NotFoundException('Rental not found');
    if (rental.renterId !== userId)
      throw new ForbiddenException('Not authorized');
    if (rental.status !== RentalStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Rental is not pending payment');
    }

    const owner = rental.listing.user;
    if (!owner?.stripeAccountId) {
      throw new BadRequestException(
        'Owner has not completed Stripe onboarding',
      );
    }

    const platformFeePercent =
      this.configService.get<number>('STRIPE_PLATFORM_FEE_PERCENT') ?? 10;
    const amountInCents = Math.round(Number(rental.totalAmount) * 100);
    const platformFee = Math.round(amountInCents * (platformFeePercent / 100));

    const session = await this.stripeService.createCheckoutSession({
      amount: amountInCents,
      currency: 'usd',
      ownerStripeAccountId: owner.stripeAccountId,
      rentalId: rental.id,
      platformFee,
      successUrl: `${this.configService.get('FRONTEND_URL')}/payment-return?rentalId=${rental.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${this.configService.get('FRONTEND_URL')}/listings/${rental.listingId}?paymentCancelled=true`,
    });

    return { url: session.url! };
  }

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripeService.constructWebhookEvent(payload, signature);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const rentalId = paymentIntent.metadata?.rentalId;
        if (rentalId) {
          await this.confirmPayment(rentalId, paymentIntent.id);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const rentalId = paymentIntent.metadata?.rentalId;
        if (rentalId) {
          await this.rentalRepository.update(
            { id: rentalId },
            { status: RentalStatus.EXPIRED },
          );
        }
        break;
      }
    }
  }
}
