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

        // Seed gifts for local development (only if using emulator)
        // Wait a bit for Firestore to be fully ready
        setTimeout(() => {
          this.seedGifts().catch((error) => {
            console.warn(
              '⚠️  Could not seed gifts:',
              error instanceof Error ? error.message : String(error),
            );
          });
        }, 2000);
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
   * Seed the gifts collection with sample Greece travel gifts (local development only)
   */
  private async seedGifts(): Promise<void> {
    if (!this.db) {
      console.warn('⚠️  Cannot seed gifts: Firestore not initialized');
      return;
    }

    try {
      // Check if gifts already exist
      const giftsSnapshot = await this.db.collection('gifts').limit(1).get();

      if (!giftsSnapshot.empty) {
        console.log('📦 Gifts collection already has data, skipping seed');
        return;
      }

      console.log('🌴 Seeding gifts collection with Greece travel gifts...');

      const FieldValue = this.getFieldValue();
      const gifts = [
        {
          nome: 'Hotel em Santorini',
          descricao:
            '3 noites em um hotel boutique com vista para o pôr do sol em Santorini. Inclui café da manhã e traslado do aeroporto.',
          preco: 450.0,
          estoque: 1,
          imagem:
            'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=1200&q=80',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Curso de Mergulho em Mykonos',
          descricao:
            'Curso de mergulho certificado PADI para iniciantes. Inclui equipamento completo, instrutor certificado e certificado digital.',
          preco: 280.0,
          estoque: 2,
          imagem:
            'https://images.unsplash.com/photo-1583212292454-2fe62f3f3dd6?w=1200&q=80',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Jantar Romântico em Atenas',
          descricao:
            'Jantar para dois em restaurante tradicional grego no centro histórico de Atenas. Inclui entrada, prato principal, sobremesa e vinho grego.',
          preco: 120.0,
          estoque: 3,
          imagem:
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Passagens Aéreas para Grécia',
          descricao:
            'Passagens aéreas ida e volta para Atenas em classe econômica. Válido para voos diretos ou com conexão.',
          preco: 850.0,
          estoque: 1,
          imagem:
            'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Tour pelas Ilhas Gregas',
          descricao:
            'Cruzeiro de 1 dia visitando as ilhas de Mykonos, Delos e Paros. Inclui almoço a bordo, guia turístico e transporte.',
          preco: 180.0,
          estoque: 2,
          imagem:
            'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&q=80',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Spa e Relaxamento em Mykonos',
          descricao:
            'Pacote de spa de 2 horas incluindo massagem relaxante, banho turco e tratamento facial. Perfeito para relaxar após os passeios.',
          preco: 150.0,
          estoque: 2,
          imagem:
            'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&q=80',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Aluguel de Carro por 5 Dias',
          descricao:
            'Aluguel de carro compacto por 5 dias com seguro completo. Inclui GPS e quilometragem ilimitada. Retirada e devolução no aeroporto.',
          preco: 220.0,
          estoque: 1,
          imagem:
            'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=80',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Tour Gastronômico em Atenas',
          descricao:
            'Tour guiado de 3 horas pelos melhores restaurantes e tavernas de Atenas. Inclui degustação de pratos tradicionais e vinhos gregos.',
          preco: 95.0,
          estoque: 2,
          imagem:
            'https://images.unsplash.com/photo-1555939594-58d7cb561b1d?w=1200&q=80',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Hospedagem em Mykonos',
          descricao:
            '4 noites em hotel 4 estrelas em Mykonos, próximo às praias mais famosas. Inclui café da manhã e Wi-Fi gratuito.',
          preco: 520.0,
          estoque: 1,
          imagem:
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Aula de Culinária Grega',
          descricao:
            'Aula de culinária tradicional grega de 4 horas. Aprenda a preparar moussaka, souvlaki e baklava. Inclui almoço e receitas.',
          preco: 110.0,
          estoque: 2,
          imagem:
            'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Presente de Teste',
          descricao: 'Presente de teste para validação de pagamento.',
          preco: 0.1,
          estoque: 10,
          imagem:
            'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
      ];

      // Add all gifts to Firestore
      const batch = this.db.batch();
      gifts.forEach((gift) => {
        const giftRef = this.db!.collection('gifts').doc();
        batch.set(giftRef, gift);
      });

      await batch.commit();
      console.log(
        `✅ Successfully seeded ${gifts.length} gifts to the collection`,
      );
    } catch (error) {
      console.error('❌ Error seeding gifts:', error);
      // Don't throw - this is just a convenience feature
    }
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
        public: true, // Make the file publicly accessible
      });

      // Get the public URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491', // Far future date
      });

      // For public files, we can also use the public URL directly
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;

      console.log(`✅ Image uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error('❌ Error downloading/uploading image:', error);
      throw error;
    }
  }
}
