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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
exports.FirebaseService = void 0;
const common_1 = require("@nestjs/common");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
let FirebaseService = class FirebaseService {
    constructor() {
        this.db = null;
        this.initialized = false;
    }
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
            const isProduction = process.env.NODE_ENV === 'production';
            console.log(`📋 isProduction: ${isProduction}`);
            if (isProduction && process.env.FIRESTORE_EMULATOR_HOST) {
                console.warn('⚠️  WARNING: FIRESTORE_EMULATOR_HOST is set in production! This should not happen.');
                console.warn('⚠️  Unsetting FIRESTORE_EMULATOR_HOST to use production Firestore.');
                delete process.env.FIRESTORE_EMULATOR_HOST;
            }
            if (!isProduction && !process.env.FIRESTORE_EMULATOR_HOST) {
                const defaultEmulatorHost = 'localhost:8081';
                console.log(`🔧 Setting FIRESTORE_EMULATOR_HOST to ${defaultEmulatorHost} for local development`);
                process.env.FIRESTORE_EMULATOR_HOST = defaultEmulatorHost;
            }
            if (!admin.apps.length) {
                if (isProduction) {
                    const projectId = process.env.GCP_PROJECT ||
                        process.env.GCLOUD_PROJECT ||
                        process.env.GOOGLE_CLOUD_PROJECT ||
                        'casamento-mari-joao';
                    console.log(`🔧 Initializing Firebase Admin for production with project: ${projectId}`);
                    admin.initializeApp({
                        projectId: projectId,
                    });
                    console.log(`✅ Initialized Firebase Admin for production with project: ${projectId}`);
                }
                else {
                    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8081';
                    console.log(`🔧 Initializing Firebase Admin for local development with emulator at ${emulatorHost}`);
                    admin.initializeApp({
                        projectId: 'demo-project',
                    });
                    console.log(`✅ Initialized Firebase Admin with emulator at ${emulatorHost}`);
                }
            }
            else {
                console.log('✅ Firebase Admin already initialized');
            }
            this.db = admin.firestore();
            this.initialized = true;
            const app = admin.app();
            const firestoreProjectId = app.options.projectId;
            console.log(`✅ Firestore initialized with project ID: ${firestoreProjectId}`);
            if (process.env.FIRESTORE_EMULATOR_HOST) {
                console.log(`✅ Firestore will use emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
                this.testEmulatorConnection().catch((error) => {
                    console.warn('⚠️  Could not verify emulator connection:', error instanceof Error ? error.message : String(error));
                    console.warn('⚠️  This might be normal if the emulator is still starting up.');
                });
            }
            else {
                console.log('✅ Firestore will use production database');
            }
        }
        catch (error) {
            console.error('❌ Failed to initialize Firebase Admin:', error);
            console.error('Error details:', error instanceof Error ? error.stack : String(error));
            if (error instanceof Error) {
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                if ('code' in error) {
                    console.error('Error code:', error.code);
                }
            }
            console.warn('⚠️  Continuing without Firebase initialization - some features may not work');
            this.initialized = false;
        }
    }
    async testEmulatorConnection() {
        if (!this.db)
            return;
        try {
            const testRef = this.db.collection('_test').doc('connection');
            await testRef.get();
            console.log('✅ Emulator connection test successful');
        }
        catch (error) {
            console.warn('⚠️  Emulator connection test failed:', error instanceof Error ? error.message : String(error));
        }
    }
    getFirestore() {
        if (!this.db) {
            throw new Error('Firebase Admin not initialized. Check logs for initialization errors.');
        }
        return this.db;
    }
    isInitialized() {
        return this.initialized;
    }
    getFieldValue() {
        return firestore_1.FieldValue;
    }
};
exports.FirebaseService = FirebaseService;
exports.FirebaseService = FirebaseService = __decorate([
    (0, common_1.Injectable)()
], FirebaseService);
//# sourceMappingURL=firebase.service.js.map