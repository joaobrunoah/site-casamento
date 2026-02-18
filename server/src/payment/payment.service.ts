import { createHmac } from 'crypto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

const MERCADOPAGO_PREFERENCES_URL =
  'https://api.mercadopago.com/checkout/preferences';
const MERCADOPAGO_PAYMENTS_URL = 'https://api.mercadopago.com/v1/payments';

export type PurchaseStatus = 'pending' | 'approved' | 'rejected';

export interface SavePurchaseInput {
  fromName: string;
  email?: string;
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
  payer_email?: string;
}

export interface MercadoPagoPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

@Injectable()
export class PaymentService {
  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Verifies the Mercado Pago webhook x-signature using MERCADO_PAGO_SECRET_SIGNATURE.
   * See: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
   */
  verifyWebhookSignature(
    xSignature: string | undefined,
    xRequestId: string | undefined,
    dataId: string | undefined,
  ): boolean {
    const secret = (process.env.MERCADO_PAGO_SECRET_SIGNATURE || '').trim();
    if (!secret) {
      return false;
    }
    if (!xSignature || dataId === undefined || dataId === null) {
      return false;
    }
    const parts = xSignature.split(',');
    let ts: string | null = null;
    let receivedHash: string | null = null;
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const key = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (key === 'ts') ts = value;
      else if (key === 'v1') receivedHash = value;
    }
    if (!ts || !receivedHash) {
      return false;
    }
    const dataIdStr = String(dataId);
    const manifestId = /^[a-zA-Z0-9]+$/.test(dataIdStr)
      ? dataIdStr.toLowerCase()
      : dataIdStr;
    const partsManifest: string[] = [`id:${manifestId}`];
    if (xRequestId != null && xRequestId !== '') {
      partsManifest.push(`request-id:${xRequestId}`);
    }
    partsManifest.push(`ts:${ts}`);
    const manifest = partsManifest.join(';') + ';';
    const computed = createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');
    return computed === receivedHash;
  }

  async createCheckoutPreference(
    body: CreatePreferenceBody,
  ): Promise<MercadoPagoPreferenceResponse> {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new HttpException(
        'Mercado Pago is not configured (MERCADOPAGO_ACCESS_TOKEN missing)',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const rawFrontend = (process.env.FRONTEND_URL || '')
      .trim()
      .replace(/\/+$/, '');
    if (!rawFrontend || rawFrontend === 'undefined') {
      throw new HttpException(
        'FRONTEND_URL is required for payment return URLs (e.g. http://localhost:3000 or your production URL)',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (
      !rawFrontend.startsWith('http://') &&
      !rawFrontend.startsWith('https://')
    ) {
      throw new HttpException(
        'FRONTEND_URL must start with http:// or https://',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const frontendUrl = rawFrontend;

    const successUrl =
      body.external_reference != null && body.external_reference !== ''
        ? `${frontendUrl}/checkout/success?purchase_id=${encodeURIComponent(body.external_reference)}`
        : `${frontendUrl}/checkout/success`;
    const failureUrl =
      body.external_reference != null && body.external_reference !== ''
        ? `${frontendUrl}/payment?status=failure&purchase_id=${encodeURIComponent(body.external_reference)}`
        : `${frontendUrl}/payment?status=failure`;
    const pendingUrl =
      body.external_reference != null && body.external_reference !== ''
        ? `${frontendUrl}/payment?status=pending&purchase_id=${encodeURIComponent(body.external_reference)}`
        : `${frontendUrl}/payment?status=pending`;

    if (
      !successUrl.startsWith('http://') &&
      !successUrl.startsWith('https://')
    ) {
      throw new HttpException(
        'FRONTEND_URL must be a full URL (e.g. http://localhost:3000 or https://your-site.com). Got: ' +
          (frontendUrl || '(empty)'),
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
          ...(item.description && {
            description: item.description.substring(0, 256),
          }),
        };
      }),
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      ...(body.external_reference && {
        external_reference: body.external_reference,
      }),
      ...(body.payer_email && {
        payer: {
          email: body.payer_email,
        },
      }),
    };
    if (isHttps) {
      payload.auto_return = 'approved';
    }
    const notificationUrl = (process.env.NOTIFICATION_URL || '').trim();
    if (notificationUrl && notificationUrl.startsWith('http')) {
      payload.notification_url = notificationUrl;
    }

    // Debug: log payload and response (remover em produção se quiser)
    console.log(
      '[Mercado Pago] Creating preference with payload:',
      JSON.stringify(payload, null, 2),
    );

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
        const errJson = JSON.parse(responseText) as {
          message?: string;
          cause?: Array<{ description?: string }>;
        };
        if (errJson.message) message = errJson.message;
        else if (Array.isArray(errJson.cause) && errJson.cause[0]?.description)
          message = errJson.cause[0].description;
      } catch {
        if (response.status === 401)
          message =
            'Invalid Mercado Pago access token. Check MERCADOPAGO_ACCESS_TOKEN.';
        else if (response.status === 400)
          message =
            'Invalid request to Mercado Pago. Check item data (title, quantity, unit_price).';
      }
      console.error('Mercado Pago API error:', response.status, responseText);
      throw new HttpException(message, HttpStatus.BAD_GATEWAY);
    }

    const data = JSON.parse(responseText) as MercadoPagoPreferenceResponse;

    // Usar sandbox_init_point quando o token é de teste (Checkout Pro em modo sandbox)
    const isTestToken = accessToken.startsWith('TEST-');
    const initPoint =
      isTestToken && data.sandbox_init_point
        ? data.sandbox_init_point
        : data.init_point;

    console.log('[Mercado Pago] Preference created:', {
      id: data.id,
      init_point: initPoint,
      isTestToken,
    });

    return { ...data, init_point: initPoint };
  }

  async savePurchase(input: SavePurchaseInput): Promise<string> {
    const db = this.firebaseService.getFirestore();
    const FieldValue = this.firebaseService.getFieldValue();

    const purchase = {
      fromName: input.fromName,
      email: input.email || '',
      message: input.message || '',
      gifts: input.gifts,
      totalPrice: input.totalPrice,
      paymentId: input.paymentId || null,
      status: (input as { status?: PurchaseStatus }).status || 'pending',
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('purchases').add(purchase);
    return docRef.id;
  }

  async getPurchase(id: string): Promise<{
    id: string;
    fromName: string;
    email: string;
    message: string;
    gifts: Array<{
      id?: string;
      nome: string;
      descricao?: string;
      preco: number;
      quantidade: number;
    }>;
    totalPrice: number;
    paymentId: string | null;
    status: PurchaseStatus;
    createdAt: unknown;
  } | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('purchases').doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    const gifts = (data.gifts || []) as Array<{
      id?: string;
      nome?: string;
      descricao?: string;
      preco?: number;
      quantidade?: number;
    }>;
    return {
      id: doc.id,
      fromName: data.fromName || '',
      email: data.email || '',
      message: data.message || '',
      gifts: gifts.map((g) => ({
        id: g.id,
        nome: g.nome || '',
        descricao: g.descricao,
        preco: Number(g.preco) || 0,
        quantidade: g.quantidade ?? 1,
      })),
      totalPrice: data.totalPrice ?? 0,
      paymentId: data.paymentId ?? null,
      status: (data.status as PurchaseStatus) || 'pending',
      createdAt: data.createdAt,
    };
  }

  async updatePurchaseStatus(
    purchaseId: string,
    status: PurchaseStatus,
    paymentId: string | null,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db
      .collection('purchases')
      .doc(purchaseId)
      .update({
        status,
        ...(paymentId != null && { paymentId }),
      });
  }

  /**
   * Decrements inventory (estoque) for each gift in the purchase.
   * Only call this when payment is approved.
   */
  private async decrementGiftInventory(purchaseId: string): Promise<void> {
    const purchase = await this.getPurchase(purchaseId);
    if (!purchase?.gifts?.length) return;

    const db = this.firebaseService.getFirestore();
    const FieldValue = this.firebaseService.getFieldValue();

    for (const item of purchase.gifts) {
      const giftId = item.id;
      const qty = Math.max(0, Math.floor(item.quantidade ?? 1));
      if (!giftId || qty === 0) continue;

      const giftRef = db.collection('gifts').doc(giftId);
      try {
        await giftRef.update({
          estoque: FieldValue.increment(-qty),
        });
        console.log(
          '[Webhook] Decremented gift',
          giftId,
          'by',
          qty,
        );
      } catch (err) {
        console.error(
          '[Webhook] Failed to decrement inventory for gift',
          giftId,
          err,
        );
      }
    }
  }

  async handleWebhookNotification(paymentId: string): Promise<void> {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('[Webhook] MERCADOPAGO_ACCESS_TOKEN not set');
      return;
    }
    const response = await fetch(`${MERCADOPAGO_PAYMENTS_URL}/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      console.error(
        '[Webhook] Failed to fetch payment from Mercado Pago:',
        response.status,
        await response.text(),
      );
      return;
    }
    const payment = (await response.json()) as {
      status?: string;
      external_reference?: string | null;
      id?: number | string;
    };
    const externalRef = payment.external_reference ?? null;
    if (!externalRef) {
      console.warn(
        '[Webhook] Payment has no external_reference, skipping:',
        paymentId,
      );
      return;
    }
    const statusMap: Record<string, PurchaseStatus> = {
      approved: 'approved',
      rejected: 'rejected',
      cancelled: 'rejected',
      refunded: 'rejected',
      charged_back: 'rejected',
      in_process: 'pending',
      pending: 'pending',
      in_mediation: 'pending',
    };
    const purchaseStatus = statusMap[payment.status ?? ''] ?? 'pending';
    await this.updatePurchaseStatus(
      externalRef,
      purchaseStatus,
      String(payment.id ?? paymentId),
    );
    if (purchaseStatus === 'approved') {
      await this.decrementGiftInventory(externalRef);
    }
    console.log(
      '[Webhook] Updated purchase',
      externalRef,
      'to status',
      purchaseStatus,
      'payment',
      paymentId,
    );
  }

  async listPurchases(): Promise<
    Array<{
      id: string;
      fromName: string;
      email: string;
      message: string;
      gifts: Array<{
        id?: string;
        nome: string;
        descricao?: string;
        preco: number;
        quantidade: number;
      }>;
      totalPrice: number;
      paymentId: string | null;
      status: PurchaseStatus;
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
        id?: string;
        nome?: string;
        descricao?: string;
        preco?: number;
        quantidade?: number;
      }>;
      return {
        id: doc.id,
        fromName: data.fromName || '',
        email: data.email || '',
        message: data.message || '',
        gifts: gifts.map((g) => ({
          id: g.id,
          nome: g.nome || '',
          descricao: g.descricao,
          preco: Number(g.preco) ?? 0,
          quantidade: g.quantidade ?? 1,
        })),
        totalPrice: data.totalPrice ?? 0,
        paymentId: data.paymentId ?? null,
        status: (data.status as PurchaseStatus) || 'pending',
        createdAt: data.createdAt,
      };
    });
  }
}
