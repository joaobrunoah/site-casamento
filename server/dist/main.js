"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envLocalPath)) {
    console.log('📋 Loading .env.local file...');
    dotenv.config({ path: envLocalPath });
}
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
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        console.log('✅ NestJS application created successfully');
        app.enableCors({
            origin: '*',
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
            allowedHeaders: 'Content-Type, Authorization, X-Auth-Hash',
            maxAge: 3600,
        });
        const port = process.env.PORT || 8080;
        const host = '0.0.0.0';
        await app.listen(port, host);
        console.log(`🚀 Application is running on: http://${host}:${port}`);
        console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔧 PORT env var: ${process.env.PORT || 'not set (using default 8080)'}`);
    }
    catch (error) {
        console.error('❌ Failed to start application:', error);
        process.exit(1);
    }
}
bootstrap().catch((error) => {
    console.error('❌ Unhandled error during bootstrap:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map