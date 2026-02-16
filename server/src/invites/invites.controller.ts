import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { AuthGuard } from '../auth/auth.guard';
import { FirebaseService } from '../firebase/firebase.service';
import { FieldValue } from 'firebase-admin/firestore';

@Controller()
export class InvitesController {
  constructor(private firebaseService: FirebaseService) {}

  private async fetchGuestsForInvite(inviteId: string): Promise<any[]> {
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

  @Get('listInvites')
  async listInvites() {
    try {
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection('invites').get();
      const invites = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const inviteData = doc.data();
          const guests = await this.fetchGuestsForInvite(doc.id);
          return {
            id: doc.id,
            ...inviteData,
            guests: guests.map(({ inviteId, ...guestData }) => guestData),
          };
        }),
      );
      return invites;
    } catch (error) {
      console.error('Error fetching invites', error);
      throw new HttpException(
        'Failed to fetch invites',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('getInvite')
  async getInvite(@Query('id') id: string) {
    try {
      if (!id) {
        throw new HttpException('Invite ID is required', HttpStatus.BAD_REQUEST);
      }

      const db = this.firebaseService.getFirestore();
      const inviteDoc = await db.collection('invites').doc(id).get();

      if (!inviteDoc.exists) {
        throw new HttpException('Invite not found', HttpStatus.NOT_FOUND);
      }

      const inviteData = inviteDoc.data();
      const guests = await this.fetchGuestsForInvite(id);

      return {
        id: inviteDoc.id,
        ...inviteData,
        guests: guests.map(({ inviteId, ...guestData }) => guestData),
      };
    } catch (error) {
      console.error('Error fetching invite', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch invite',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('postInvite')
  @UseGuards(AuthGuard)
  async postInvite(@Body() body: any) {
    try {
      const {
        id,
        nomeDoConvite,
        ddi,
        telefone,
        grupo,
        observacao,
        guests,
      } = body;

      if (nomeDoConvite === undefined || nomeDoConvite === null) {
        throw new HttpException(
          'Campo obrigatório: nomeDoConvite',
          HttpStatus.BAD_REQUEST,
        );
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

      let inviteId: string;
      let inviteRef: admin.firestore.DocumentReference;

      if (id) {
        inviteRef = db.collection('invites').doc(id);
        await inviteRef.set(inviteData, { merge: true });
        inviteId = id;

        // Delete existing guests
        const existingGuests = await db
          .collection('guests')
          .where('inviteId', '==', inviteId)
          .get();
        const deletePromises = existingGuests.docs.map((doc) => doc.ref.delete());
        await Promise.all(deletePromises);
      } else {
        inviteRef = await db.collection('invites').add({
          ...inviteData,
          createdAt: FieldValue.serverTimestamp(),
        });
        inviteId = inviteRef.id;
      }

      // Save guests
      if (guests && Array.isArray(guests)) {
        const guestPromises = guests.map(async (guest: any) => {
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
    } catch (error) {
      console.error('Error saving invite', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to save invite',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('updateInvite')
  @UseGuards(AuthGuard)
  async updateInvite(@Query('id') id: string, @Body() updateData: any) {
    try {
      const inviteId = id || updateData.id;

      if (!inviteId) {
        throw new HttpException('Invite ID is required', HttpStatus.BAD_REQUEST);
      }

      if (!updateData || typeof updateData !== 'object') {
        throw new HttpException('Invalid update data', HttpStatus.BAD_REQUEST);
      }

      const db = this.firebaseService.getFirestore();
      const FieldValue = this.firebaseService.getFieldValue();
      const inviteRef = db.collection('invites').doc(inviteId);
      const inviteDoc = await inviteRef.get();

      if (!inviteDoc.exists) {
        throw new HttpException('Invite not found', HttpStatus.NOT_FOUND);
      }

      // Handle guest updates
      if (updateData.guests && Array.isArray(updateData.guests)) {
        const isFullReplacement =
          updateData.guests.length > 0 &&
          (updateData.guests[0].nome !== undefined ||
            updateData.guests[0].genero !== undefined ||
            updateData.guests[0].faixaEtaria !== undefined);

        if (isFullReplacement) {
          const existingGuests = await db
            .collection('guests')
            .where('inviteId', '==', inviteId)
            .get();
          const deletePromises = existingGuests.docs.map((doc) =>
            doc.ref.delete(),
          );
          await Promise.all(deletePromises);

          const guestPromises = updateData.guests.map(async (guest: any) => {
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
        } else {
          const currentGuests = await this.fetchGuestsForInvite(inviteId);
          updateData.guests.forEach((guestUpdate: any) => {
            if (
              guestUpdate.index !== undefined &&
              guestUpdate.index >= 0 &&
              guestUpdate.index < currentGuests.length
            ) {
              const guestId = currentGuests[guestUpdate.index].id;
              const guestRef = db.collection('guests').doc(guestId);
              const updateFields: any = {
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
    } catch (error) {
      console.error('Error updating invite', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update invite',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('deleteInvite')
  @UseGuards(AuthGuard)
  async deleteInvite(@Query('id') id: string, @Body() body?: any) {
    try {
      const inviteId = id || body?.id;

      if (!inviteId) {
        throw new HttpException('Invite ID is required', HttpStatus.BAD_REQUEST);
      }

      const db = this.firebaseService.getFirestore();
      const inviteRef = db.collection('invites').doc(inviteId);
      const inviteDoc = await inviteRef.get();

      if (!inviteDoc.exists) {
        throw new HttpException('Invite not found', HttpStatus.NOT_FOUND);
      }

      // Delete all guests
      const guestsSnapshot = await db
        .collection('guests')
        .where('inviteId', '==', inviteId)
        .get();
      const deleteGuestPromises = guestsSnapshot.docs.map((doc) =>
        doc.ref.delete(),
      );
      await Promise.all(deleteGuestPromises);

      await inviteRef.delete();

      return {
        success: true,
        message: 'Invite deleted successfully',
        id: inviteId,
      };
    } catch (error) {
      console.error('Error deleting invite', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete invite',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('updateInviteConfirmation')
  async updateInviteConfirmation(@Body() body: any) {
    try {
      const {
        id,
        guests,
        intoleranciaGluten,
        intoleranciaLactose,
        intoleranciaOutro,
        aeroportoChegada,
        dataChegada,
        horaChegada,
        transporteAeroportoHotel,
        transporteHotelFesta,
        transporteFestaHotel,
      } = body;

      if (!id) {
        throw new HttpException('Invite ID is required', HttpStatus.BAD_REQUEST);
      }

      const db = this.firebaseService.getFirestore();
      const FieldValue = this.firebaseService.getFieldValue();
      const inviteRef = db.collection('invites').doc(id);
      const inviteDoc = await inviteRef.get();

      if (!inviteDoc.exists) {
        throw new HttpException('Invite not found', HttpStatus.NOT_FOUND);
      }

      const updateData: any = {
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
      if (dataChegada !== undefined) updateData.dataChegada = dataChegada;
      if (horaChegada !== undefined) updateData.horaChegada = horaChegada;
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
    } catch (error) {
      console.error('Error updating invite confirmation', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update confirmation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
