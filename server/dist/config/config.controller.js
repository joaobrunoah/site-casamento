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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/auth.guard");
const auth_service_1 = require("../auth/auth.service");
const firebase_service_1 = require("../firebase/firebase.service");
let ConfigController = class ConfigController {
    constructor(firebaseService, authService) {
        this.firebaseService = firebaseService;
        this.authService = authService;
    }
    async getConfig() {
        try {
            const db = this.firebaseService.getFirestore();
            const configDoc = await db.collection('config').doc('config').get();
            if (!configDoc.exists) {
                const defaultConfig = {
                    'show-confirmation-form': false,
                    'show-gifts-list': false,
                };
                await db.collection('config').doc('config').set(defaultConfig);
                return { success: true, config: defaultConfig };
            }
            return { success: true, config: configDoc.data() };
        }
        catch (error) {
            console.error('Error fetching config', error);
            throw new common_1.HttpException('Erro ao buscar configuração', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateConfig(updateData) {
        try {
            if (!updateData || typeof updateData !== 'object') {
                throw new common_1.HttpException('Dados inválidos', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            await db
                .collection('config')
                .doc('config')
                .set(updateData, { merge: true });
            const updatedDoc = await db.collection('config').doc('config').get();
            return { success: true, config: updatedDoc.data() };
        }
        catch (error) {
            console.error('Error updating config', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Erro ao atualizar configuração', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async login(body) {
        try {
            const { user, password } = body;
            if (!user || !password) {
                throw new common_1.HttpException('Usuário e senha são obrigatórios', common_1.HttpStatus.BAD_REQUEST);
            }
            const validUser = process.env.ADMIN_USER;
            const validPassword = process.env.ADMIN_PASSWORD;
            if (!validUser || !validPassword) {
                console.error('Admin credentials not configured in environment');
                throw new common_1.HttpException('Configuração do servidor inválida', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
            if (user === validUser && password === validPassword) {
                return {
                    success: true,
                    message: 'Login realizado com sucesso',
                    hash: this.authService.generateAdminHash(),
                };
            }
            else {
                throw new common_1.HttpException('Usuário ou senha incorretos', common_1.HttpStatus.UNAUTHORIZED);
            }
        }
        catch (error) {
            console.error('Error in login', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Erro ao processar login', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.ConfigController = ConfigController;
__decorate([
    (0, common_1.Get)('getConfig'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ConfigController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)('updateConfig'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConfigController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConfigController.prototype, "login", null);
exports.ConfigController = ConfigController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService,
        auth_service_1.AuthService])
], ConfigController);
//# sourceMappingURL=config.controller.js.map