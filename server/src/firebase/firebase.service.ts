import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private db: admin.firestore.Firestore | null = null;
  private initialized = false;

  onModuleInit() {
    console.log('🔧 Starting Firebase Admin initialization...');
    console.log(`📋 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`📋 NODE_ENV === 'production': ${process.env.NODE_ENV === 'production'}`);
    console.log(`📋 GCP_PROJECT: ${process.env.GCP_PROJECT || 'not set'}`);
    console.log(`📋 GCLOUD_PROJECT: ${process.env.GCLOUD_PROJECT || 'not set'}`);
    console.log(`📋 GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT || 'not set'}`);
    console.log(`📋 FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST || 'not set'}`);
    console.log(`📋 GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set (using ADC)'}`);
    
    try {
      // Determine if we're in production
      // In production, NEVER use emulator, even if FIRESTORE_EMULATOR_HOST is set
      const isProduction = process.env.NODE_ENV === 'production';
      console.log(`📋 isProduction: ${isProduction}`);
      
      // If in production but emulator host is set, warn and unset it
      if (isProduction && process.env.FIRESTORE_EMULATOR_HOST) {
        console.warn('⚠️  WARNING: FIRESTORE_EMULATOR_HOST is set in production! This should not happen.');
        console.warn('⚠️  Unsetting FIRESTORE_EMULATOR_HOST to use production Firestore.');
        delete process.env.FIRESTORE_EMULATOR_HOST;
      }
      
      // For local development, ensure FIRESTORE_EMULATOR_HOST is set BEFORE initialization
      // Firebase Admin SDK checks this env var when admin.firestore() is called
      if (!isProduction && !process.env.FIRESTORE_EMULATOR_HOST) {
        const defaultEmulatorHost = 'localhost:8081';
        console.log(`🔧 Setting FIRESTORE_EMULATOR_HOST to ${defaultEmulatorHost} for local development`);
        process.env.FIRESTORE_EMULATOR_HOST = defaultEmulatorHost;
      }
      
      // Initialize Firebase Admin if not already initialized
      if (!admin.apps.length) {
        if (isProduction) {
          // Production: initialize with project ID from environment
          // Cloud Run automatically provides Application Default Credentials (ADC)
          // Try multiple environment variable names that Cloud Run might set
          const projectId = 
            process.env.GCP_PROJECT || 
            process.env.GCLOUD_PROJECT || 
            process.env.GOOGLE_CLOUD_PROJECT || 
            'casamento-mari-joao';
          
          console.log(`🔧 Initializing Firebase Admin for production with project: ${projectId}`);
          
          // Initialize with explicit project ID
          // Cloud Run provides ADC automatically, so we don't need to specify credentials
          admin.initializeApp({
            projectId: projectId,
            // Credentials will be automatically picked up from the environment
            // Cloud Run service account has the necessary permissions
          });
          
          console.log(`✅ Initialized Firebase Admin for production with project: ${projectId}`);
        } else {
          // Local development: use emulator
          // FIRESTORE_EMULATOR_HOST should already be set above, but double-check
          const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8081';
          console.log(`🔧 Initializing Firebase Admin for local development with emulator at ${emulatorHost}`);
          
          admin.initializeApp({
            projectId: 'demo-project', // Use the same project ID as the emulator
          });
          
          console.log(`✅ Initialized Firebase Admin with emulator at ${emulatorHost}`);
        }
      } else {
        console.log('✅ Firebase Admin already initialized');
      }
      
      // Get Firestore instance - it will automatically use FIRESTORE_EMULATOR_HOST if set
      // The env var must be set before this call for the SDK to use the emulator
      this.db = admin.firestore();
      this.initialized = true;
      
      // Verify connection by getting the project ID from the Firebase app
      const app = admin.app();
      const firestoreProjectId = app.options.projectId;
      console.log(`✅ Firestore initialized with project ID: ${firestoreProjectId}`);
      
      if (process.env.FIRESTORE_EMULATOR_HOST) {
        console.log(`✅ Firestore will use emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
        
        // Try a simple connection test to verify emulator is reachable
        this.testEmulatorConnection().catch((error) => {
          console.warn('⚠️  Could not verify emulator connection:', error instanceof Error ? error.message : String(error));
          console.warn('⚠️  This might be normal if the emulator is still starting up.');
        });
      } else {
        console.log('✅ Firestore will use production database');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error);
      console.error('Error details:', error instanceof Error ? error.stack : String(error));
      
      // Log additional debugging information
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if ('code' in error) {
          console.error('Error code:', (error as any).code);
        }
      }
      
      // Don't throw - allow the app to start even if Firebase fails
      // This way we can at least see the health endpoint and debug
      console.warn('⚠️  Continuing without Firebase initialization - some features may not work');
      this.initialized = false;
    }
  }

  private async testEmulatorConnection(): Promise<void> {
    if (!this.db) return;
    
    try {
      // Try a simple read operation to verify emulator connection
      const testRef = this.db.collection('_test').doc('connection');
      await testRef.get();
      console.log('✅ Emulator connection test successful');
    } catch (error) {
      console.warn('⚠️  Emulator connection test failed:', error instanceof Error ? error.message : String(error));
      // Don't throw - this is just a test
    }
  }

  getFirestore(): admin.firestore.Firestore {
    if (!this.db) {
      throw new Error('Firebase Admin not initialized. Check logs for initialization errors.');
    }
    return this.db;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getFieldValue(): typeof FieldValue {
    return FieldValue;
  }
}
