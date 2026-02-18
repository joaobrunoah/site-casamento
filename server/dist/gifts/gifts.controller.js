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
exports.GiftsController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/auth.guard");
const firebase_service_1 = require("../firebase/firebase.service");
let GiftsController = class GiftsController {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
    }
    async getSoldQuantityByGiftId() {
        const db = this.firebaseService.getFirestore();
        const snapshot = await db
            .collection('purchases')
            .where('status', '==', 'approved')
            .get();
        const sold = {};
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const items = (data.gifts || []);
            items.forEach((item) => {
                if (item.id) {
                    sold[item.id] = (sold[item.id] ?? 0) + (item.quantidade ?? 1);
                }
            });
        });
        return sold;
    }
    async listGifts() {
        try {
            const db = this.firebaseService.getFirestore();
            const snapshot = await db.collection('gifts').get();
            const soldByGiftId = await this.getSoldQuantityByGiftId();
            const gifts = snapshot.docs.map((doc) => {
                const data = doc.data();
                const estoque = Number(data.estoque) ?? 0;
                const sold = soldByGiftId[doc.id] ?? 0;
                const disponivel = Math.max(0, estoque - sold);
                return {
                    id: doc.id,
                    ...data,
                    estoque,
                    disponivel,
                };
            });
            return gifts;
        }
        catch (error) {
            console.error('Error fetching gifts', error);
            throw new common_1.HttpException('Failed to fetch gifts', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getGift(id) {
        try {
            if (!id) {
                throw new common_1.HttpException('Gift ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            const giftDoc = await db.collection('gifts').doc(id).get();
            if (!giftDoc.exists) {
                throw new common_1.HttpException('Gift not found', common_1.HttpStatus.NOT_FOUND);
            }
            const data = giftDoc.data();
            const soldByGiftId = await this.getSoldQuantityByGiftId();
            const estoque = Number(data.estoque) ?? 0;
            const sold = soldByGiftId[giftDoc.id] ?? 0;
            const disponivel = Math.max(0, estoque - sold);
            return {
                id: giftDoc.id,
                ...data,
                estoque,
                disponivel,
            };
        }
        catch (error) {
            console.error('Error fetching gift', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to fetch gift', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async postGift(body) {
        try {
            const { id, nome, descricao, preco, estoque, imagem } = body;
            if (!nome || nome.trim() === '') {
                throw new common_1.HttpException('Nome is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            const FieldValue = this.firebaseService.getFieldValue();
            let finalImageUrl = imagem || '';
            const giftIdForPath = id || `temp-${Date.now()}`;
            if (imagem && imagem.startsWith('http') && !imagem.includes('storage.googleapis.com') && !imagem.includes('firebasestorage.googleapis.com')) {
                try {
                    const timestamp = Date.now();
                    const sanitizedNome = nome.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
                    const fileExtension = imagem.split('.').pop()?.split('?')[0] || 'jpg';
                    const destinationPath = `gifts/${giftIdForPath}-${sanitizedNome}-${timestamp}.${fileExtension}`;
                    finalImageUrl = await this.firebaseService.downloadAndUploadImage(imagem, destinationPath);
                }
                catch (imageError) {
                    console.error('Error processing image, using original URL:', imageError);
                }
            }
            const giftData = {
                nome: nome.trim(),
                descricao: descricao || '',
                preco: preco || 0,
                estoque: estoque || 0,
                imagem: finalImageUrl,
                updatedAt: FieldValue.serverTimestamp(),
            };
            let giftId;
            let giftRef;
            if (id) {
                giftRef = db.collection('gifts').doc(id);
                await giftRef.set(giftData, { merge: true });
                giftId = id;
            }
            else {
                giftRef = await db.collection('gifts').add({
                    ...giftData,
                    createdAt: FieldValue.serverTimestamp(),
                });
                giftId = giftRef.id;
            }
            const savedDoc = await giftRef.get();
            return {
                id: giftId,
                ...savedDoc.data(),
            };
        }
        catch (error) {
            console.error('Error saving gift', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to save gift', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteGift(id) {
        try {
            if (!id) {
                throw new common_1.HttpException('Gift ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            const giftRef = db.collection('gifts').doc(id);
            const giftDoc = await giftRef.get();
            if (!giftDoc.exists) {
                throw new common_1.HttpException('Gift not found', common_1.HttpStatus.NOT_FOUND);
            }
            await giftRef.delete();
            return { success: true, id };
        }
        catch (error) {
            console.error('Error deleting gift', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to delete gift', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.GiftsController = GiftsController;
__decorate([
    (0, common_1.Get)('listGifts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "listGifts", null);
__decorate([
    (0, common_1.Get)('getGift'),
    __param(0, (0, common_1.Query)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "getGift", null);
__decorate([
    (0, common_1.Post)('postGift'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "postGift", null);
__decorate([
    (0, common_1.Delete)('deleteGift'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Query)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "deleteGift", null);
exports.GiftsController = GiftsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService])
], GiftsController);
//# sourceMappingURL=gifts.controller.js.map