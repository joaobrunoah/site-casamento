import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PaymentService, CreatePreferenceItem } from './payment.service';

class CreatePreferenceDto {
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    description?: string;
  }>;
  external_reference?: string;
  /** Email do comprador (recomendado pelo Mercado Pago para habilitar o botão Pagar) */
  payer_email?: string;
}

class SavePurchaseDto {
  fromName: string;
  email?: string;
  message?: string;
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

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-preference')
  @HttpCode(HttpStatus.OK)
  async createPreference(@Body() dto: CreatePreferenceDto): Promise<{ init_point: string; preference_id: string }> {
    if (!dto?.items?.length) {
      throw new HttpException('items array is required and must not be empty', HttpStatus.BAD_REQUEST);
    }
    const payerEmail = dto.payer_email?.trim();
    if (payerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
      throw new HttpException('payer_email must be a valid email address', HttpStatus.BAD_REQUEST);
    }
    const items: CreatePreferenceItem[] = dto.items.map((i) => ({
      title: i.title,
      quantity: i.quantity,
      unit_price: i.unit_price,
      description: i.description,
    }));
    const result = await this.paymentService.createCheckoutPreference({
      items,
      external_reference: dto.external_reference,
      payer_email: payerEmail || undefined,
    });
    return {
      init_point: result.init_point,
      preference_id: result.id,
    };
  }

  @Get('list-purchases')
  @UseGuards(AuthGuard)
  async listPurchases() {
    return this.paymentService.listPurchases();
  }

  @Post('save-purchase')
  @HttpCode(HttpStatus.CREATED)
  async savePurchase(@Body() dto: SavePurchaseDto): Promise<{ id: string }> {
    if (!dto?.fromName?.trim()) {
      throw new HttpException('fromName is required', HttpStatus.BAD_REQUEST);
    }
    if (!Array.isArray(dto.gifts) || dto.gifts.length === 0) {
      throw new HttpException('gifts array is required and must not be empty', HttpStatus.BAD_REQUEST);
    }
    const id = await this.paymentService.savePurchase({
      fromName: dto.fromName.trim(),
      email: dto.email?.trim() || undefined,
      message: dto.message?.trim() || '',
      gifts: dto.gifts,
      totalPrice: Number(dto.totalPrice),
      paymentId: dto.paymentId,
    });
    return { id };
  }

  @Get('purchase/:id')
  async getPurchase(@Param('id') id: string) {
    if (!id?.trim()) {
      throw new HttpException('Purchase id is required', HttpStatus.BAD_REQUEST);
    }
    const purchase = await this.paymentService.getPurchase(id.trim());
    if (!purchase) {
      throw new HttpException('Purchase not found', HttpStatus.NOT_FOUND);
    }
    return purchase;
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
    @Body()
    body: {
      type?: string;
      data?: { id?: string };
    },
  ): Promise<{ ok: boolean }> {
    const dataId = body?.data?.id;
    const paymentId = dataId;
    if (body?.type !== 'payment' || !paymentId) {
      return { ok: true };
    }
    const secret = (process.env.MERCADO_PAGO_SECRET_SIGNATURE || '').trim();
    if (!secret) {
      throw new HttpException(
        'Webhook signature verification not configured (MERCADO_PAGO_SECRET_SIGNATURE missing)',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const isValid = this.paymentService.verifyWebhookSignature(
      xSignature,
      xRequestId,
      dataId,
    );
    if (!isValid) {
      throw new HttpException(
        'Invalid webhook signature',
        HttpStatus.UNAUTHORIZED,
      );
    }
    this.paymentService.handleWebhookNotification(String(paymentId)).catch((err) => {
      console.error('[Webhook] Error processing notification:', err);
    });
    return { ok: true };
  }
}
