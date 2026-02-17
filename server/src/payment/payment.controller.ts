import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';

interface CreatePaymentIntentDto {
  amount: number;
  currency: string;
  cart: Array<{
    giftId?: string;
    giftName: string;
    price: number;
    quantity: number;
  }>;
  fromName: string;
  message: string;
  paymentMethodType?: 'card' | 'pix' | 'boleto';
}

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('create-intent')
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    try {
      if (!dto.amount || dto.amount <= 0) {
        throw new HttpException(
          'Amount must be greater than 0',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!dto.currency) {
        throw new HttpException('Currency is required', HttpStatus.BAD_REQUEST);
      }

      if (!dto.cart || dto.cart.length === 0) {
        throw new HttpException('Cart cannot be empty', HttpStatus.BAD_REQUEST);
      }

      const result = await this.paymentService.createPaymentIntent(
        dto.amount,
        dto.currency,
        dto.cart,
        dto.fromName || '',
        dto.message || '',
        dto.paymentMethodType,
      );

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error in createPaymentIntent controller:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to create payment intent: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
