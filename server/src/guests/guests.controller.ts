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
export class GuestsController {
  constructor(private firebaseService: FirebaseService) {}

  @Get('getGuest')
  async getGuest(@Query('id') id: string) {
    try {
      if (!id) {
        throw new HttpException('Guest ID is required', HttpStatus.BAD_REQUEST);
      }

      const db = this.firebaseService.getFirestore();
      const guestDoc = await db.collection('guests').doc(id).get();

      if (!guestDoc.exists) {
        throw new HttpException('Guest not found', HttpStatus.NOT_FOUND);
      }

      const guestData = guestDoc.data();
      const { inviteId, ...guestWithoutInviteId } = guestData!;

      return {
        id: guestDoc.id,
        ...guestWithoutInviteId,
      };
    } catch (error) {
      console.error('Error fetching guest', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch guest',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('postGuest')
  @UseGuards(AuthGuard)
  async postGuest(@Body() body: any) {
    try {
      const {
        id,
        inviteId,
        nome,
        genero,
        faixaEtaria,
        custo,
        situacao,
        mesa,
      } = body;

      if (!inviteId) {
        throw new HttpException('inviteId is required', HttpStatus.BAD_REQUEST);
      }

      const db = this.firebaseService.getFirestore();
      const FieldValue = this.firebaseService.getFieldValue();

      const inviteDoc = await db.collection('invites').doc(inviteId).get();
      if (!inviteDoc.exists) {
        throw new HttpException('Invite not found', HttpStatus.NOT_FOUND);
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

      let guestId: string;
      let guestRef: admin.firestore.DocumentReference;

      if (id) {
        guestRef = db.collection('guests').doc(id);
        await guestRef.set(guestData, { merge: true });
        guestId = id;
      } else {
        guestRef = await db.collection('guests').add({
          ...guestData,
          createdAt: FieldValue.serverTimestamp(),
        });
        guestId = guestRef.id;
      }

      const savedDoc = await guestRef.get();
      const savedData = savedDoc.data()!;
      const { inviteId: savedInviteId, ...guestWithoutInviteId } = savedData;

      return {
        id: guestId,
        ...guestWithoutInviteId,
      };
    } catch (error) {
      console.error('Error saving guest', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to save guest',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('updateGuest')
  @UseGuards(AuthGuard)
  async updateGuest(@Query('id') id: string, @Body() updateData: any) {
    try {
      const guestId = id || updateData.id;

      if (!guestId) {
        throw new HttpException('Guest ID is required', HttpStatus.BAD_REQUEST);
      }

      if (!updateData || typeof updateData !== 'object') {
        throw new HttpException('Invalid update data', HttpStatus.BAD_REQUEST);
      }

      const db = this.firebaseService.getFirestore();
      const FieldValue = this.firebaseService.getFieldValue();
      const guestRef = db.collection('guests').doc(guestId);
      const guestDoc = await guestRef.get();

      if (!guestDoc.exists) {
        throw new HttpException('Guest not found', HttpStatus.NOT_FOUND);
      }

      const { id: updateDataId, inviteId, ...fieldsToUpdate } = updateData;
      const finalUpdateData = {
        ...fieldsToUpdate,
        updatedAt: FieldValue.serverTimestamp(),
      };

      await guestRef.update(finalUpdateData);
      const updatedDoc = await guestRef.get();
      const updatedData = updatedDoc.data()!;
      const { inviteId: updatedInviteId, ...guestWithoutInviteId } = updatedData;

      return {
        id: guestId,
        ...guestWithoutInviteId,
      };
    } catch (error) {
      console.error('Error updating guest', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update guest',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('deleteGuest')
  @UseGuards(AuthGuard)
  async deleteGuest(@Query('id') id: string, @Body() body?: any) {
    try {
      const guestId = id || body?.id;

      if (!guestId) {
        throw new HttpException('Guest ID is required', HttpStatus.BAD_REQUEST);
      }

      const db = this.firebaseService.getFirestore();
      const guestRef = db.collection('guests').doc(guestId);
      const guestDoc = await guestRef.get();

      if (!guestDoc.exists) {
        throw new HttpException('Guest not found', HttpStatus.NOT_FOUND);
      }

      await guestRef.delete();

      return {
        success: true,
        message: 'Guest deleted successfully',
        id: guestId,
      };
    } catch (error) {
      console.error('Error deleting guest', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete guest',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
