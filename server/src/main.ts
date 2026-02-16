import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env files
// Priority: .env.local > .env
// This must be done BEFORE any other imports that use process.env
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');

// Load .env.local first (higher priority)
if (fs.existsSync(envLocalPath)) {
  console.log('📋 Loading .env.local file...');
  dotenv.config({ path: envLocalPath });
}

// Load .env (will not override .env.local values)
if (fs.existsSync(envPath)) {
  console.log('📋 Loading .env file...');
  dotenv.config({ path: envPath });
}

async function bootstrap() {
  console.log('🚀 Starting NestJS application bootstrap...');
  console.log(`📋 Node version: ${process.version}`);
  console.log(`📋 Platform: ${process.platform}`);
  console.log(`📋 PORT: ${process.env.PORT || '8080 (default)'}`);
  console.log(`📋 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`📋 ADMIN_USER: ${process.env.ADMIN_USER ? '***set***' : 'not set'}`);
  console.log(`📋 ADMIN_PASSWORD: ${process.env.ADMIN_PASSWORD ? '***set***' : 'not set'}`);
  console.log(`📋 FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST || 'not set'}`);
  
  try {
    console.log('🔧 Creating NestJS application...');
    const app = await NestFactory.create(AppModule);
    console.log('✅ NestJS application created successfully');
    
    // Enable CORS
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Authorization, X-Auth-Hash',
      maxAge: 3600,
    });

    // Get port from environment variable (Cloud Run sets PORT)
    const port = process.env.PORT || 8080;
    const host = '0.0.0.0'; // Cloud Run requires binding to 0.0.0.0
    
    await app.listen(port, host);
    
    console.log(`🚀 Application is running on: http://${host}:${port}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 PORT env var: ${process.env.PORT || 'not set (using default 8080)'}`);
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Unhandled error during bootstrap:', error);
  process.exit(1);
});
