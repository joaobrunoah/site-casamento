import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

const MERCADOPAGO_PREFERENCES_URL = 'https://api.mercadopago.com/checkout/preferences';

export interface SavePurchaseInput {
  fromName: string;
  message: string;
  gifts: Array<{
    id?: string;
    nome: string;
    descricao: string;
    preco: number;
    quantidade: number;
  }>;
  totalPrice: number;
  paymentId?: string;
}

export interface CreatePreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  description?: string;
}

export interface CreatePreferenceBody {
  items: CreatePreferenceItem[];
  external_reference?: string;
}

export interface MercadoPagoPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

@Injectable()
export class PaymentService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async createCheckoutPreference(body: CreatePreferenceBody): Promise<MercadoPagoPreferenceResponse> {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new HttpException(
        'Mercado Pago is not configured (MERCADOPAGO_ACCESS_TOKEN missing)',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const rawFrontend = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
    if (!rawFrontend || rawFrontend === 'undefined') {
      throw new HttpException(
        'FRONTEND_URL is required for payment return URLs (e.g. http://localhost:3000 or your production URL)',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (!rawFrontend.startsWith('http://') && !rawFrontend.startsWith('https://')) {
      throw new HttpException(
        'FRONTEND_URL must start with http:// or https://',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const frontendUrl = rawFrontend;

    const successUrl = `${frontendUrl}/checkout/success`;
    const failureUrl = `${frontendUrl}/payment?status=failure`;
    const pendingUrl = `${frontendUrl}/payment?status=pending`;

    if (!successUrl.startsWith('http://') && !successUrl.startsWith('https://')) {
      throw new HttpException(
        'FRONTEND_URL must be a full URL (e.g. http://localhost:3000 or https://your-site.com). Got: ' + (frontendUrl || '(empty)'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const isHttps = frontendUrl.startsWith('https://');
    const payload: Record<string, unknown> = {
      items: body.items.map((item) => {
        const unitPrice = Number(item.unit_price);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new HttpException(
            `Invalid unit_price for item "${item.title}": must be a positive number`,
            HttpStatus.BAD_REQUEST,
          );
        }
        return {
          title: item.title.substring(0, 256),
          quantity: Math.max(1, Math.floor(item.quantity)),
          unit_price: unitPrice,
          currency_id: 'BRL',
          ...(item.description && { description: item.description.substring(0, 256) }),
        };
      }),
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      ...(body.external_reference && { external_reference: body.external_reference }),
    };
    if (isHttps) {
      payload.auto_return = 'approved';
    }

    const response = await fetch(MERCADOPAGO_PREFERENCES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      let message = 'Failed to create payment preference';
      try {
        const errJson = JSON.parse(responseText) as { message?: string; cause?: Array<{ description?: string }> };
        if (errJson.message) message = errJson.message;
        else if (Array.isArray(errJson.cause) && errJson.cause[0]?.description)
          message = errJson.cause[0].description;
      } catch {
        if (response.status === 401) message = 'Invalid Mercado Pago access token. Check MERCADOPAGO_ACCESS_TOKEN.';
        else if (response.status === 400) message = 'Invalid request to Mercado Pago. Check item data (title, quantity, unit_price).';
      }
      console.error('Mercado Pago API error:', response.status, responseText);
      throw new HttpException(message, HttpStatus.BAD_GATEWAY);
    }

    const data = JSON.parse(responseText) as MercadoPagoPreferenceResponse;
    return data;
  }

  async savePurchase(input: SavePurchaseInput): Promise<string> {
    const db = this.firebaseService.getFirestore();
    const FieldValue = this.firebaseService.getFieldValue();

    const purchase = {
      fromName: input.fromName,
      message: input.message || '',
      gifts: input.gifts,
      totalPrice: input.totalPrice,
      paymentId: input.paymentId || null,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('purchases').add(purchase);
    return docRef.id;
  }

  async listPurchases(): Promise<
    Array<{
      id: string;
      fromName: string;
      message: string;
      gifts: Array<{ nome: string; quantidade: number }>;
      totalPrice: number;
      paymentId: string | null;
      createdAt: unknown;
    }>
  > {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('purchases')
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      const gifts = (data.gifts || []) as Array<{
        nome?: string;
        quantidade?: number;
      }>;
      return {
        id: doc.id,
        fromName: data.fromName || '',
        message: data.message || '',
        gifts: gifts.map((g) => ({
          nome: g.nome || '',
          quantidade: g.quantidade ?? 1,
        })),
        totalPrice: data.totalPrice ?? 0,
        paymentId: data.paymentId ?? null,
        createdAt: data.createdAt,
      };
    });
  }
}
