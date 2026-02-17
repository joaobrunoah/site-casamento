import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
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
}

class SavePurchaseDto {
  fromName: string;
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
    const items: CreatePreferenceItem[] = dto.items.map((i) => ({
      title: i.title,
      quantity: i.quantity,
      unit_price: i.unit_price,
      description: i.description,
    }));
    const result = await this.paymentService.createCheckoutPreference({
      items,
      external_reference: dto.external_reference,
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
      message: dto.message?.trim() || '',
      gifts: dto.gifts,
      totalPrice: Number(dto.totalPrice),
      paymentId: dto.paymentId,
    });
    return { id };
  }
}
