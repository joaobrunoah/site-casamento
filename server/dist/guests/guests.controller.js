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
exports.GuestsController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/auth.guard");
const firebase_service_1 = require("../firebase/firebase.service");
let GuestsController = class GuestsController {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
    }
    async getGuest(id) {
        try {
            if (!id) {
                throw new common_1.HttpException('Guest ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            const guestDoc = await db.collection('guests').doc(id).get();
            if (!guestDoc.exists) {
                throw new common_1.HttpException('Guest not found', common_1.HttpStatus.NOT_FOUND);
            }
            const guestData = guestDoc.data();
            const { inviteId, ...guestWithoutInviteId } = guestData;
            return {
                id: guestDoc.id,
                ...guestWithoutInviteId,
            };
        }
        catch (error) {
            console.error('Error fetching guest', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to fetch guest', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async postGuest(body) {
        try {
            const { id, inviteId, nome, genero, faixaEtaria, custo, situacao, mesa, } = body;
            if (!inviteId) {
                throw new common_1.HttpException('inviteId is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            const FieldValue = this.firebaseService.getFieldValue();
            const inviteDoc = await db.collection('invites').doc(inviteId).get();
            if (!inviteDoc.exists) {
                throw new common_1.HttpException('Invite not found', common_1.HttpStatus.NOT_FOUND);
            }
            const guestData = {
                inviteId: inviteId,
                nome: nome || '',
                genero: genero || '',
                faixaEtaria: faixaEtaria || '',
                custo: custo || '',
                situacao: situacao || '',
                mesa: mesa || '',
                updatedAt: FieldValue.serverTimestamp(),
            };
            let guestId;
            let guestRef;
            if (id) {
                guestRef = db.collection('guests').doc(id);
                await guestRef.set(guestData, { merge: true });
                guestId = id;
            }
            else {
                guestRef = await db.collection('guests').add({
                    ...guestData,
                    createdAt: FieldValue.serverTimestamp(),
                });
                guestId = guestRef.id;
            }
            const savedDoc = await guestRef.get();
            const savedData = savedDoc.data();
            const { inviteId: savedInviteId, ...guestWithoutInviteId } = savedData;
            return {
                id: guestId,
                ...guestWithoutInviteId,
            };
        }
        catch (error) {
            console.error('Error saving guest', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to save guest', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateGuest(id, updateData) {
        try {
            const guestId = id || updateData.id;
            if (!guestId) {
                throw new common_1.HttpException('Guest ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            if (!updateData || typeof updateData !== 'object') {
                throw new common_1.HttpException('Invalid update data', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            const FieldValue = this.firebaseService.getFieldValue();
            const guestRef = db.collection('guests').doc(guestId);
            const guestDoc = await guestRef.get();
            if (!guestDoc.exists) {
                throw new common_1.HttpException('Guest not found', common_1.HttpStatus.NOT_FOUND);
            }
            const { id: updateDataId, inviteId, ...fieldsToUpdate } = updateData;
            const finalUpdateData = {
                ...fieldsToUpdate,
                updatedAt: FieldValue.serverTimestamp(),
            };
            await guestRef.update(finalUpdateData);
            const updatedDoc = await guestRef.get();
            const updatedData = updatedDoc.data();
            const { inviteId: updatedInviteId, ...guestWithoutInviteId } = updatedData;
            return {
                id: guestId,
                ...guestWithoutInviteId,
            };
        }
        catch (error) {
            console.error('Error updating guest', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to update guest', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteGuest(id, body) {
        try {
            const guestId = id || body?.id;
            if (!guestId) {
                throw new common_1.HttpException('Guest ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            const guestRef = db.collection('guests').doc(guestId);
            const guestDoc = await guestRef.get();
            if (!guestDoc.exists) {
                throw new common_1.HttpException('Guest not found', common_1.HttpStatus.NOT_FOUND);
            }
            await guestRef.delete();
            return {
                success: true,
                message: 'Guest deleted successfully',
                id: guestId,
            };
        }
        catch (error) {
            console.error('Error deleting guest', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to delete guest', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.GuestsController = GuestsController;
__decorate([
    (0, common_1.Get)('getGuest'),
    __param(0, (0, common_1.Query)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GuestsController.prototype, "getGuest", null);
__decorate([
    (0, common_1.Post)('postGuest'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GuestsController.prototype, "postGuest", null);
__decorate([
    (0, common_1.Put)('updateGuest'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Query)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GuestsController.prototype, "updateGuest", null);
__decorate([
    (0, common_1.Delete)('deleteGuest'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Query)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GuestsController.prototype, "deleteGuest", null);
exports.GuestsController = GuestsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService])
], GuestsController);
//# sourceMappingURL=guests.controller.js.map