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
exports.InvitesController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/auth.guard");
const firebase_service_1 = require("../firebase/firebase.service");
let InvitesController = class InvitesController {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
    }
    async fetchGuestsForInvite(inviteId) {
        const db = this.firebaseService.getFirestore();
        const guestsSnapshot = await db
            .collection('guests')
            .where('inviteId', '==', inviteId)
            .get();
        return guestsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    }
    async listInvites() {
        try {
            const db = this.firebaseService.getFirestore();
            const snapshot = await db.collection('invites').get();
            const invites = await Promise.all(snapshot.docs.map(async (doc) => {
                const inviteData = doc.data();
                const guests = await this.fetchGuestsForInvite(doc.id);
                return {
                    id: doc.id,
                    ...inviteData,
                    guests: guests.map(({ inviteId, ...guestData }) => guestData),
                };
            }));
            return invites;
        }
        catch (error) {
            console.error('Error fetching invites', error);
            throw new common_1.HttpException('Failed to fetch invites', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getInvite(id) {
        try {
            if (!id) {
                throw new common_1.HttpException('Invite ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            const inviteDoc = await db.collection('invites').doc(id).get();
            if (!inviteDoc.exists) {
                throw new common_1.HttpException('Invite not found', common_1.HttpStatus.NOT_FOUND);
            }
            const inviteData = inviteDoc.data();
            const guests = await this.fetchGuestsForInvite(id);
            return {
                id: inviteDoc.id,
                ...inviteData,
                guests: guests.map(({ inviteId, ...guestData }) => guestData),
            };
        }
        catch (error) {
            console.error('Error fetching invite', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to fetch invite', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async postInvite(body) {
        try {
            const { id, nomeDoConvite, ddi, telefone, grupo, observacao, guests, } = body;
            if (nomeDoConvite === undefined || nomeDoConvite === null) {
                throw new common_1.HttpException('Campo obrigatório: nomeDoConvite', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            const FieldValue = this.firebaseService.getFieldValue();
            const inviteData = {
                nomeDoConvite: nomeDoConvite || '',
                ddi: ddi || '',
                telefone: telefone || '',
                grupo: grupo || '',
                observacao: observacao || '',
                intoleranciaGluten: body.intoleranciaGluten || false,
                intoleranciaLactose: body.intoleranciaLactose || false,
                intoleranciaOutro: body.intoleranciaOutro || '',
                aeroportoChegada: body.aeroportoChegada || '',
                dataChegada: body.dataChegada || '',
                horaChegada: body.horaChegada || '',
                transporteAeroportoHotel: body.transporteAeroportoHotel || false,
                transporteHotelFesta: body.transporteHotelFesta || false,
                transporteFestaHotel: body.transporteFestaHotel || false,
                updatedAt: FieldValue.serverTimestamp(),
            };
            let inviteId;
            let inviteRef;
            if (id) {
                inviteRef = db.collection('invites').doc(id);
                await inviteRef.set(inviteData, { merge: true });
                inviteId = id;
                const existingGuests = await db
                    .collection('guests')
                    .where('inviteId', '==', inviteId)
                    .get();
                const deletePromises = existingGuests.docs.map((doc) => doc.ref.delete());
                await Promise.all(deletePromises);
            }
            else {
                inviteRef = await db.collection('invites').add({
                    ...inviteData,
                    createdAt: FieldValue.serverTimestamp(),
                });
                inviteId = inviteRef.id;
            }
            if (guests && Array.isArray(guests)) {
                const guestPromises = guests.map(async (guest) => {
                    const { id: guestId, ...guestData } = guest;
                    const guestRef = db.collection('guests').doc();
                    await guestRef.set({
                        inviteId: inviteId,
                        ...guestData,
                        createdAt: FieldValue.serverTimestamp(),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                    return guestRef.id;
                });
                await Promise.all(guestPromises);
            }
            const savedDoc = await inviteRef.get();
            const savedGuests = await this.fetchGuestsForInvite(inviteId);
            return {
                id: inviteId,
                ...savedDoc.data(),
                guests: savedGuests.map(({ inviteId, ...guestData }) => guestData),
            };
        }
        catch (error) {
            console.error('Error saving invite', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to save invite', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateInvite(id, updateData) {
        try {
            const inviteId = id || updateData.id;
            if (!inviteId) {
                throw new common_1.HttpException('Invite ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            if (!updateData || typeof updateData !== 'object') {
                throw new common_1.HttpException('Invalid update data', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            const FieldValue = this.firebaseService.getFieldValue();
            const inviteRef = db.collection('invites').doc(inviteId);
            const inviteDoc = await inviteRef.get();
            if (!inviteDoc.exists) {
                throw new common_1.HttpException('Invite not found', common_1.HttpStatus.NOT_FOUND);
            }
            if (updateData.guests && Array.isArray(updateData.guests)) {
                const isFullReplacement = updateData.guests.length > 0 &&
                    (updateData.guests[0].nome !== undefined ||
                        updateData.guests[0].genero !== undefined ||
                        updateData.guests[0].faixaEtaria !== undefined);
                if (isFullReplacement) {
                    const existingGuests = await db
                        .collection('guests')
                        .where('inviteId', '==', inviteId)
                        .get();
                    const deletePromises = existingGuests.docs.map((doc) => doc.ref.delete());
                    await Promise.all(deletePromises);
                    const guestPromises = updateData.guests.map(async (guest) => {
                        const { id: guestId, ...guestData } = guest;
                        const guestRef = db.collection('guests').doc();
                        await guestRef.set({
                            inviteId: inviteId,
                            ...guestData,
                            createdAt: FieldValue.serverTimestamp(),
                            updatedAt: FieldValue.serverTimestamp(),
                        });
                        return guestRef.id;
                    });
                    await Promise.all(guestPromises);
                }
                else {
                    const currentGuests = await this.fetchGuestsForInvite(inviteId);
                    updateData.guests.forEach((guestUpdate) => {
                        if (guestUpdate.index !== undefined &&
                            guestUpdate.index >= 0 &&
                            guestUpdate.index < currentGuests.length) {
                            const guestId = currentGuests[guestUpdate.index].id;
                            const guestRef = db.collection('guests').doc(guestId);
                            const updateFields = {
                                updatedAt: FieldValue.serverTimestamp(),
                            };
                            if (guestUpdate.situacao !== undefined) {
                                updateFields.situacao = guestUpdate.situacao;
                            }
                            if (guestUpdate.mesa !== undefined) {
                                updateFields.mesa = guestUpdate.mesa;
                            }
                            guestRef.update(updateFields);
                        }
                    });
                }
            }
            const { id: updateDataId, guests, ...fieldsToUpdate } = updateData;
            const finalUpdateData = {
                ...fieldsToUpdate,
                updatedAt: FieldValue.serverTimestamp(),
            };
            await inviteRef.update(finalUpdateData);
            const updatedDoc = await inviteRef.get();
            const updatedGuests = await this.fetchGuestsForInvite(inviteId);
            return {
                id: inviteId,
                ...updatedDoc.data(),
                guests: updatedGuests.map(({ inviteId, ...guestData }) => guestData),
            };
        }
        catch (error) {
            console.error('Error updating invite', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to update invite', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteInvite(id, body) {
        try {
            const inviteId = id || body?.id;
            if (!inviteId) {
                throw new common_1.HttpException('Invite ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            const inviteRef = db.collection('invites').doc(inviteId);
            const inviteDoc = await inviteRef.get();
            if (!inviteDoc.exists) {
                throw new common_1.HttpException('Invite not found', common_1.HttpStatus.NOT_FOUND);
            }
            const guestsSnapshot = await db
                .collection('guests')
                .where('inviteId', '==', inviteId)
                .get();
            const deleteGuestPromises = guestsSnapshot.docs.map((doc) => doc.ref.delete());
            await Promise.all(deleteGuestPromises);
            await inviteRef.delete();
            return {
                success: true,
                message: 'Invite deleted successfully',
                id: inviteId,
            };
        }
        catch (error) {
            console.error('Error deleting invite', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to delete invite', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateInviteConfirmation(body) {
        try {
            const { id, guests, intoleranciaGluten, intoleranciaLactose, intoleranciaOutro, aeroportoChegada, dataChegada, horaChegada, transporteAeroportoHotel, transporteHotelFesta, transporteFestaHotel, } = body;
            if (!id) {
                throw new common_1.HttpException('Invite ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const db = this.firebaseService.getFirestore();
            const FieldValue = this.firebaseService.getFieldValue();
            const inviteRef = db.collection('invites').doc(id);
            const inviteDoc = await inviteRef.get();
            if (!inviteDoc.exists) {
                throw new common_1.HttpException('Invite not found', common_1.HttpStatus.NOT_FOUND);
            }
            const updateData = {
                updatedAt: FieldValue.serverTimestamp(),
            };
            if (intoleranciaGluten !== undefined)
                updateData.intoleranciaGluten = intoleranciaGluten;
            if (intoleranciaLactose !== undefined)
                updateData.intoleranciaLactose = intoleranciaLactose;
            if (intoleranciaOutro !== undefined)
                updateData.intoleranciaOutro = intoleranciaOutro;
            if (aeroportoChegada !== undefined)
                updateData.aeroportoChegada = aeroportoChegada;
            if (dataChegada !== undefined)
                updateData.dataChegada = dataChegada;
            if (horaChegada !== undefined)
                updateData.horaChegada = horaChegada;
            if (transporteAeroportoHotel !== undefined)
                updateData.transporteAeroportoHotel = transporteAeroportoHotel;
            if (transporteHotelFesta !== undefined)
                updateData.transporteHotelFesta = transporteHotelFesta;
            if (transporteFestaHotel !== undefined)
                updateData.transporteFestaHotel = transporteFestaHotel;
            await inviteRef.update(updateData);
            if (guests && Array.isArray(guests)) {
                for (const guestUpdate of guests) {
                    if (guestUpdate.id && guestUpdate.situacao !== undefined) {
                        const guestRef = db.collection('guests').doc(guestUpdate.id);
                        await guestRef.update({
                            situacao: guestUpdate.situacao,
                            updatedAt: FieldValue.serverTimestamp(),
                        });
                    }
                }
            }
            const updatedDoc = await inviteRef.get();
            const updatedGuests = await this.fetchGuestsForInvite(id);
            return {
                success: true,
                id: id,
                ...updatedDoc.data(),
                guests: updatedGuests.map(({ inviteId, ...guestData }) => guestData),
            };
        }
        catch (error) {
            console.error('Error updating invite confirmation', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to update confirmation', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.InvitesController = InvitesController;
__decorate([
    (0, common_1.Get)('listInvites'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "listInvites", null);
__decorate([
    (0, common_1.Get)('getInvite'),
    __param(0, (0, common_1.Query)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "getInvite", null);
__decorate([
    (0, common_1.Post)('postInvite'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "postInvite", null);
__decorate([
    (0, common_1.Put)('updateInvite'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Query)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "updateInvite", null);
__decorate([
    (0, common_1.Delete)('deleteInvite'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Query)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "deleteInvite", null);
__decorate([
    (0, common_1.Post)('updateInviteConfirmation'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "updateInviteConfirmation", null);
exports.InvitesController = InvitesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService])
], InvitesController);
//# sourceMappingURL=invites.controller.js.map