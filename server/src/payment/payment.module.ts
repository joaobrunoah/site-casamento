import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { FirebaseService } from '../firebase/firebase.service';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, FirebaseService],
})
export class PaymentModule {}
