import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import Stripe from 'stripe';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(private firebaseService: FirebaseService) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    cart: Array<{
      giftId?: string;
      giftName: string;
      price: number;
      quantity: number;
    }>,
    fromName: string,
    message: string,
    paymentMethodType?: 'card' | 'pix' | 'boleto',
  ): Promise<{ clientSecret: string }> {
    try {
      // Create payment intent with specific payment method or all methods
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount,
        currency: currency.toLowerCase(),
        metadata: {
          fromName,
          message,
          cartItems: JSON.stringify(cart),
        },
      };

      if (paymentMethodType) {
        // Create payment intent with specific payment method
        paymentIntentParams.payment_method_types = [paymentMethodType];
        if (paymentMethodType === 'pix' || paymentMethodType === 'boleto') {
          paymentIntentParams.payment_method_options = {
            [paymentMethodType]: {
              expires_after_days: paymentMethodType === 'boleto' ? 3 : undefined,
            },
          };
        }
      } else {
        // Use automatic payment methods to enable all available methods
        paymentIntentParams.automatic_payment_methods = {
          enabled: true,
          allow_redirects: 'always',
        };
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

      // Store payment intent in Firestore for tracking
      const db = this.firebaseService.getFirestore();
      await db.collection('payment_intents').doc(paymentIntent.id).set({
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        status: paymentIntent.status,
        fromName,
        message,
        cart,
        createdAt: new Date(),
      });

      return {
        clientSecret: paymentIntent.client_secret || '',
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error && 'type' in error ? (error as any).type : 'Unknown';
      console.error('Error details:', { errorMessage, errorDetails, error });
      throw new HttpException(
        `Failed to create payment intent: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
      );

      // Update Firestore with latest status
      const db = this.firebaseService.getFirestore();
      await db.collection('payment_intents').doc(paymentIntentId).update({
        status: paymentIntent.status,
        updatedAt: new Date(),
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw new HttpException(
        'Failed to confirm payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
