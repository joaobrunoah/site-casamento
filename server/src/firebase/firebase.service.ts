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
      const ESTOQUE = 5;

      // Faixas solicitadas:
      // - 5 itens entre R$85 e R$150
      // - 7 itens entre R$150 e R$300
      // - 5 itens entre R$300 e R$700
      // - 4 itens entre R$700 e R$1.500
      // - 3 itens acima de R$1.500
      // Total: 24 itens, estoque 5 cada
      const gifts = [
        {
          nome: 'Gyros da Madrugada em Atenas',
          descricao:
            'Depois de um dia inteiro explorando, nada melhor que um gyros suculento para fechar a noite felizes da vida.',
          preco: 95,
          estoque: 6,
          imagem:
            'https://www.tasteofhome.com/wp-content/uploads/2024/03/Homemade-Gyros_EXPS_FT24_269750_EC_010424_10.jpg',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Sorvete Grego à Beira-Mar',
          descricao: 'Uma pausa doce durante um passeio pelas ilhas gregas.',
          preco: 110,
          estoque: 5,
          imagem:
            'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/18/53/56/23/mitatos-handcrafted-ice.jpg?w=600&h=300&s=1',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        // --- R$85 a R$150 (5 itens) ---
        {
          nome: 'Uber em Atenas',
          descricao:
            'Nosso transporte confortável entre aeroporto, hotel e passeios.',
          preco: 97,
          estoque: 4,
          imagem:
            'https://dicadagrecia.com.br/wp-content/uploads/sites/24/2020/04/taxi-atenas-grecia-jpg.webp',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Brinde Grego a Dois',
          descricao:
            'Taças levantadas com vinho grego para celebrar nossa lua de mel.',
          preco: 160,
          estoque: 4,
          imagem:
            'https://dayanecasal.com/wp-content/uploads/2023/08/IMG_9524.jpg',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Tour em Plaka',
          descricao:
            'Caminhada charmosa por Plaka e Monastiraki com guia local, histórias curiosas e aquelas dicas de comida que so os locais conhecem.',
          preco: 126,
          estoque: 5,
          imagem:
            'https://uploads.grupodicas.com/2024/07/PqCmvEuV-plaka-atenas-jpeg.webp',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Date na Acrópole',
          descricao:
            'Entradas para explorar a Acrópole juntinhos e tirar fotos inesquecíveis.',
          preco: 220,
          estoque: 4,
          imagem:
            'https://cdn-imgix.headout.com/microbrands-banner-image/image/b698f96a3bf7e35418940973f33c4708-The%20Acropolis%20of%20Athens.jpeg',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Modo Férias: Spa em Casal',
          descricao:
            'Uma hora de massagem para desligar do mundo e recarregar as energias entre um passeio e outro.',
          preco: 149,
          estoque: 4,
          imagem:
            'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1a/68/5a/29/old-city-hamam.jpg?w=500&h=500&s=1',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        // --- R$150 a R$300 (7 itens) ---
        {
          nome: 'MasterChef da Lua de Mel',
          descricao:
            'Aula pratica para aprendermos receitas gregas e testar nosso talento culinario juntos.',
          preco: 227,
          estoque: 4,
          imagem:
            'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1b/06/23/1b/caption.jpg?w=500&h=400&s=1',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Jantar com Vista para a Acrópole',
          descricao:
            'Mesa especial em rooftop para brindar nossa história com vista iluminada.',
          preco: 350,
          estoque: 3,
          imagem:
            'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2c/e0/5d/60/acropolis-on-your-plate.jpg?w=900&h=500&s=1',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Catamarã no Mar Egeu',
          descricao:
            'Meio dia navegando com paradas para mergulho em águas cristalinas.',
          preco: 417,
          estoque: 3,
          imagem:
            'https://imageresizer.yachtsbt.com/boats/117724/5eb3f583d9e2447a5233c6ed.jpeg?method=fit&width=360&height=300&format=jpeg',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Tour gastronômico em Atenas',
          descricao:
            'Um roteiro delicioso pelos sabores tradicionais da Grécia.',
          preco: 258,
          estoque: 4,
          imagem:
            'https://www.fuiserviajante.com/wp-content/uploads/2020/04/culinaria-grega-pratos-tipicos.jpg',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Aula de dança Grega',
          descricao: 'Uma experiência divertida para entrarmos no ritmo local.',
          preco: 230,
          estoque: 3,
          imagem:
            'https://www.listenandlearn.com.br/blog/wp-content/uploads/2013/12/washington-DC-greek-wedding-58.jpg',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Espumante no Pôr do Sol em Santorini',
          descricao: 'Um brinde especial vendo o sol desaparecer no mar Egeu.',
          preco: 280,
          estoque: 4,
          imagem:
            'https://media-cdn.tripadvisor.com/media/photo-s/11/39/de/d8/melhor-combinacao-champagne.jpg',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Diária Charmosa em Santorini',
          descricao:
            'Uma noite acordando com vista cinematográfica da caldeira.',
          preco: 480,
          imagem:
            'https://cdn.hotel.express/santorini_grecia_fd0230cf29/santorini_grecia_fd0230cf29.jpg',
          estoque: 3,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Ensaio Fotográfico em Santorini',
          descricao: 'Fotos profissionais para eternizar nossa lua de mel.',
          preco: 390,
          estoque: 2,
          imagem:
            'https://media.tacdn.com/media/attractions-splice-spp-674x446/12/8f/c0/e0.jpg',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Aluguel de Carro',
          descricao: 'Um dia de carro para explorar os arredores de Atenas.',
          preco: 299,
          estoque: 3,
          imagem:
            'https://dicadagrecia.com.br/wp-content/uploads/sites/24/2020/03/aluguel-carro-grecia-5-1-jpg.webp',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        // --- R$300 a R$700 (5 itens) ---
        {
          nome: 'Passeio de Barco Privativo (Cota)',
          descricao:
            'Ajuda para realizarmos um cruzeiro de um dia para Paxos, Antipaxos e Grutas Azuis.',
          preco: 650,
          estoque: 3,
          quota: true,
          imagem:
            'https://cdn.getyourguide.com/image/format=auto,fit=crop,gravity=center,quality=60,height=465,dpr=2/tour_img/563e3e7b4f5cef20.jpeg',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Jantar nas termas de Agripa',
          descricao: 'Um jantar à luz de velas nas antigas termas de Agripa.',
          preco: 446,
          estoque: 3,
          imagem:
            'https://cdn.getyourguide.com/image/format=auto,fit=crop,gravity=center,quality=60,height=465,dpr=2/tour_img/fed765b9fdb733d354f17b10f9cb060af51da466d6ed1e826c546f519236dbf1.jpg',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Mergulho a Dois no Mar Egeu',
          descricao:
            'Experiência de mergulho com instrutor e todo equipamento incluso para descobrirmos juntos o fundo do mar grego.',
          preco: 463,
          estoque: 3,
          imagem:
            'https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1200&q=80',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        // --- R$700 a R$1.500 (4 itens) ---
        {
          nome: 'Mini Temporada em Hotel Boutique (Cota)',
          descricao:
            'Contribuição para três noites especiais em hotel boutique.',
          preco: 700,
          estoque: 3,
          quota: true,
          imagem:
            'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/30/b9/70/3b/caption.jpg?w=900&h=500&s=1',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },

        // --- Acima de R$1.500 (3 itens) ---
        {
          nome: 'Voo Atenas - Mykonos (Cota)',
          descricao: 'Parte das passagens entre as ilhas gregas.',
          preco: 780,
          estoque: 4,
          quota: true,
          imagem:
            'https://dicadagrecia.com.br/wp-content/uploads/sites/24/2020/07/mykonos-aeroporto-aviao-jpg.webp',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {
          nome: 'Passagem Aérea Brasil - Grécia (Cota)',
          descricao: 'Contribuição para o grande vôo da nossa lua de mel.',
          preco: 1200,
          estoque: 5,
          quota: true,
          imagem:
            'https://dicadagrecia.com.br/wp-content/uploads/sites/24/2020/11/aviao-grecia-jpg.webp',
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
