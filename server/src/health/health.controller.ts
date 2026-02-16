import { Controller, Get } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { FieldValue } from 'firebase-admin/firestore';

@Controller()
export class HealthController {
  constructor(private firebaseService: FirebaseService) {}

  @Get()
  root() {
    return { status: 'OK', message: 'Nest.js API funcionando', service: 'wedding-api' };
  }

  @Get('health')
  health() {
    return { status: 'OK', message: 'Nest.js API funcionando', service: 'wedding-api' };
  }

  @Get('testFirestore')
  async testFirestore() {
    try {
      const db = this.firebaseService.getFirestore();
      const FieldValue = this.firebaseService.getFieldValue();

      const testRef = db.collection('_test').doc('connection');
      await testRef.set({ timestamp: FieldValue.serverTimestamp() });
      await testRef.get();

      const invitesRef = db.collection('invites');
      const snapshot = await invitesRef.limit(1).get();

      return {
        status: 'OK',
        message: 'Firestore is accessible',
        emulator:
          process.env.FIRESTORE_EMULATOR_HOST || 'Not using emulator',
        invitesCount: snapshot.size,
      };
    } catch (error) {
      console.error('Firestore test failed', error);
      return {
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error),
        emulator: process.env.FIRESTORE_EMULATOR_HOST || 'Not set',
      };
    }
  }
}
