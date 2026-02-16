"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const firebase_service_1 = require("../firebase/firebase.service");
let HealthController = class HealthController {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
    }
    root() {
        return { status: 'OK', message: 'Nest.js API funcionando', service: 'wedding-api' };
    }
    health() {
        return { status: 'OK', message: 'Nest.js API funcionando', service: 'wedding-api' };
    }
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
                emulator: process.env.FIRESTORE_EMULATOR_HOST || 'Not using emulator',
                invitesCount: snapshot.size,
            };
        }
        catch (error) {
            console.error('Firestore test failed', error);
            return {
                status: 'ERROR',
                error: error instanceof Error ? error.message : String(error),
                emulator: process.env.FIRESTORE_EMULATOR_HOST || 'Not set',
            };
        }
    }
    getEnv() {
        return {
            NODE_ENV: process.env.NODE_ENV || 'not set',
            isProduction: process.env.NODE_ENV === 'production',
            FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || 'not set',
            ADMIN_USER: process.env.ADMIN_USER ? '***set***' : 'not set',
            ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? '***set***' : 'not set',
            GCP_PROJECT: process.env.GCP_PROJECT || 'not set',
            GCLOUD_PROJECT: process.env.GCLOUD_PROJECT || 'not set',
            GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'not set',
            firebaseInitialized: this.firebaseService.isInitialized(),
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "root", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('testFirestore'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "testFirestore", null);
__decorate([
    (0, common_1.Get)('env'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "getEnv", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService])
], HealthController);
//# sourceMappingURL=health.controller.js.map