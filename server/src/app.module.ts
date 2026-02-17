import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';
import { ConfigController } from './config/config.controller';
import { InvitesController } from './invites/invites.controller';
import { GuestsController } from './guests/guests.controller';
import { GiftsController } from './gifts/gifts.controller';
import { SearchController } from './search/search.controller';
import { HealthController } from './health/health.controller';
import { FirebaseService } from './firebase/firebase.service';

@Module({
  imports: [ConfigModule, AuthModule, PaymentModule],
  controllers: [
    ConfigController,
    InvitesController,
    GuestsController,
    GiftsController,
    SearchController,
    HealthController,
  ],
  providers: [FirebaseService],
})
export class AppModule {}
