import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private db: admin.firestore.Firestore | null = null;
  private initialized = false;

  onModuleInit() {
    console.log('🔧 Starting Firebase Admin initialization...');
    console.log(`📋 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(
      `📋 NODE_ENV === 'production': ${process.env.NODE_ENV === 'production'}`,
    );
    console.log(`📋 GCP_PROJECT: ${process.env.GCP_PROJECT || 'not set'}`);
    console.log(
      `📋 GCLOUD_PROJECT: ${process.env.GCLOUD_PROJECT || 'not set'}`,
    );
    console.log(
      `📋 GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT || 'not set'}`,
    );
    console.log(
      `📋 FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST || 'not set'}`,
    );
    console.log(
      `📋 GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set (using ADC)'}`,
    );

    try {
      // Determine if we're in production
      // In production, NEVER use emulator, even if FIRESTORE_EMULATOR_HOST is set
      const isProduction = process.env.NODE_ENV === 'production';
      console.log(`📋 isProduction: ${isProduction}`);

      // If in production but emulator host is set, warn and unset it
      if (isProduction && process.env.FIRESTORE_EMULATOR_HOST) {
        console.warn(
          '⚠️  WARNING: FIRESTORE_EMULATOR_HOST is set in production! This should not happen.',
        );
        console.warn(
          '⚠️  Unsetting FIRESTORE_EMULATOR_HOST to use production Firestore.',
        );
        delete process.env.FIRESTORE_EMULATOR_HOST;
      }

      // For local development, ensure FIRESTORE_EMULATOR_HOST is set BEFORE initialization
      // Firebase Admin SDK checks this env var when admin.firestore() is called
      if (!isProduction && !process.env.FIRESTORE_EMULATOR_HOST) {
        const defaultEmulatorHost = 'localhost:8081';
        console.log(
          `🔧 Setting FIRESTORE_EMULATOR_HOST to ${defaultEmulatorHost} for local development`,
        );
        process.env.FIRESTORE_EMULATOR_HOST = defaultEmulatorHost;
      }

      if (!isProduction && !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
        const defaultStorageEmulatorHost = 'localhost:9199';
        console.log(
          `🔧 Setting FIREBASE_STORAGE_EMULATOR_HOST to ${defaultStorageEmulatorHost} for local development`,
        );
        process.env.FIREBASE_STORAGE_EMULATOR_HOST = defaultStorageEmulatorHost;
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

          console.log(
            `🔧 Initializing Firebase Admin for production with project: ${projectId}`,
          );

          // Initialize with explicit project ID
          // Cloud Run provides ADC automatically, so we don't need to specify credentials
          admin.initializeApp({
            projectId: projectId,
            storageBucket:
              process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
            // Credentials will be automatically picked up from the environment
            // Cloud Run service account has the necessary permissions
          });

          console.log(
            `✅ Initialized Firebase Admin for production with project: ${projectId}`,
          );
        } else {
          // Local development: use emulator
          // FIRESTORE_EMULATOR_HOST should already be set above, but double-check
          const emulatorHost =
            process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8081';
          console.log(
            `🔧 Initializing Firebase Admin for local development with emulator at ${emulatorHost}`,
          );

          admin.initializeApp({
            projectId: 'demo-project', // Use the same project ID as the emulator
            storageBucket:
              process.env.FIREBASE_STORAGE_BUCKET ||
              'demo-project.appspot.com',
          });

          console.log(
            `✅ Initialized Firebase Admin with emulator at ${emulatorHost}`,
          );
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
      console.log(
        `✅ Firestore initialized with project ID: ${firestoreProjectId}`,
      );

      if (process.env.FIRESTORE_EMULATOR_HOST) {
        console.log(
          `✅ Firestore will use emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`,
        );

        // Try a simple connection test to verify emulator is reachable
        this.testEmulatorConnection().catch((error) => {
          console.warn(
            '⚠️  Could not verify emulator connection:',
            error instanceof Error ? error.message : String(error),
          );
          console.warn(
            '⚠️  This might be normal if the emulator is still starting up.',
          );
        });

        // Seed gifts for local development (through API import script)
        // Wait a bit so Nest can start listening before script retries
        setTimeout(() => {
          this.runLocalGiftImportScript().catch((error) => {
            console.warn(
              '⚠️  Could not trigger gifts import script:',
              error instanceof Error ? error.message : String(error),
            );
          });
        }, 3000);

        if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
          console.log(
            `✅ Storage will use emulator at ${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`,
          );
        }
      } else {
        console.log('✅ Firestore will use production database');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error);
      console.error(
        'Error details:',
        error instanceof Error ? error.stack : String(error),
      );

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
      console.warn(
        '⚠️  Continuing without Firebase initialization - some features may not work',
      );
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
      console.warn(
        '⚠️  Emulator connection test failed:',
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw - this is just a test
    }
  }

  /**
   * Run the local script that calls the import API endpoint.
   */
  private async runLocalGiftImportScript(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    const scriptPath = path.resolve(
      __dirname,
      '..',
      '..',
      'scripts',
      'import-gifts-via-api.js',
    );
    const port = process.env.PORT || '8080';
    const apiBaseUrl = process.env.LOCAL_API_BASE_URL || `http://127.0.0.1:${port}`;

    const adminUser = process.env.ADMIN_USER || '';
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    const authHash = crypto
      .createHash('sha256')
      .update(`${adminUser}${adminPassword}`)
      .digest('hex');

    await new Promise<void>((resolve) => {
      const child = spawn('node', [scriptPath], {
        env: {
          ...process.env,
          API_BASE_URL: apiBaseUrl,
          X_AUTH_HASH: authHash,
          GIFTS_REPLACE_EXISTING: 'false',
        },
        stdio: 'inherit',
      });

      child.on('error', (error) => {
        console.warn('⚠️  Failed to execute gifts import script:', error.message);
        resolve();
      });

      child.on('exit', (code) => {
        if (code !== 0) {
          console.warn(`⚠️  Gifts import script exited with code ${code}`);
        }
        resolve();
      });
    });
  }

  getFirestore(): admin.firestore.Firestore {
    if (!this.db) {
      throw new Error(
        'Firebase Admin not initialized. Check logs for initialization errors.',
      );
    }
    return this.db;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getFieldValue(): typeof FieldValue {
    return FieldValue;
  }

  getStorage(): admin.storage.Storage {
    if (!this.initialized) {
      throw new Error(
        'Firebase Admin not initialized. Check logs for initialization errors.',
      );
    }
    return admin.storage();
  }

  /**
   * Download an image from a URL and upload it to Firebase Storage
   * @param imageUrl The URL of the image to download
   * @param destinationPath The path in Firebase Storage where the image should be stored
   * @returns The download URL of the uploaded image
   */
  async downloadAndUploadImage(
    imageUrl: string,
    destinationPath: string,
  ): Promise<string> {
    try {
      // Validate URL
      if (!imageUrl || !imageUrl.startsWith('http')) {
        throw new Error('Invalid image URL');
      }

      console.log(`📥 Downloading image from: ${imageUrl}`);

      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      // Get the image as a buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Get content type from response or default to image/jpeg
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      console.log(`📤 Uploading image to Firebase Storage: ${destinationPath}`);

      // Upload to Firebase Storage
      const storage = this.getStorage();
      const bucket = storage.bucket();
      const file = bucket.file(destinationPath);

      // Upload the buffer
      await file.save(buffer, {
        metadata: {
          contentType: contentType,
        },
      });

      // In local Storage emulator, avoid signed URLs (they require ADC credentials).
      if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
        const encodedPath = encodeURIComponent(destinationPath);
        const emulatorUrl = `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
        console.log(`✅ Image uploaded successfully (emulator): ${emulatorUrl}`);
        return emulatorUrl;
      }

      // Production/public bucket URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;

      console.log(`✅ Image uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error('❌ Error downloading/uploading image:', error);
      throw error;
    }
  }
}
