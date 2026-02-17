import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';
import { FirebaseModule } from './firebase/firebase.module';
import { ConfigController } from './config/config.controller';
import { InvitesController } from './invites/invites.controller';
import { GuestsController } from './guests/guests.controller';
import { GiftsController } from './gifts/gifts.controller';
import { SearchController } from './search/search.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [FirebaseModule, ConfigModule, AuthModule, PaymentModule],
  controllers: [
    ConfigController,
    InvitesController,
    GuestsController,
    GiftsController,
    SearchController,
    HealthController,
  ],
})
export class AppModule {}
