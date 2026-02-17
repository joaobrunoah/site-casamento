import {
  Controller,
  Get,
  Post,
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
export class GiftsController {
  constructor(private firebaseService: FirebaseService) {}

  @Get('listGifts')
  async listGifts() {
    try {
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection('gifts').get();
      const gifts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return gifts;
    } catch (error) {
      console.error('Error fetching gifts', error);
      throw new HttpException(
        'Failed to fetch gifts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('getGift')
  async getGift(@Query('id') id: string) {
    try {
      if (!id) {
        throw new HttpException('Gift ID is required', HttpStatus.BAD_REQUEST);
      }

      const db = this.firebaseService.getFirestore();
      const giftDoc = await db.collection('gifts').doc(id).get();

      if (!giftDoc.exists) {
        throw new HttpException('Gift not found', HttpStatus.NOT_FOUND);
      }

      return {
        id: giftDoc.id,
        ...giftDoc.data(),
      };
    } catch (error) {
      console.error('Error fetching gift', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch gift',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('postGift')
  @UseGuards(AuthGuard)
  async postGift(@Body() body: any) {
    try {
      const { id, nome, descricao, preco, estoque, imagem } = body;

      if (!nome || nome.trim() === '') {
        throw new HttpException('Nome is required', HttpStatus.BAD_REQUEST);
      }

      const db = this.firebaseService.getFirestore();
      const FieldValue = this.firebaseService.getFieldValue();

      const giftData = {
        nome: nome.trim(),
        descricao: descricao || '',
        preco: preco || 0,
        estoque: estoque || 0,
        imagem: imagem || '',
        updatedAt: FieldValue.serverTimestamp(),
      };

      let giftId: string;
      let giftRef: admin.firestore.DocumentReference;

      if (id) {
        // Update existing gift
        giftRef = db.collection('gifts').doc(id);
        await giftRef.set(giftData, { merge: true });
        giftId = id;
      } else {
        // Create new gift
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
    } catch (error) {
      console.error('Error saving gift', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to save gift',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('deleteGift')
  @UseGuards(AuthGuard)
  async deleteGift(@Query('id') id: string) {
    try {
      if (!id) {
        throw new HttpException('Gift ID is required', HttpStatus.BAD_REQUEST);
      }

      const db = this.firebaseService.getFirestore();
      const giftRef = db.collection('gifts').doc(id);
      const giftDoc = await giftRef.get();

      if (!giftDoc.exists) {
        throw new HttpException('Gift not found', HttpStatus.NOT_FOUND);
      }

      await giftRef.delete();

      return { success: true, id };
    } catch (error) {
      console.error('Error deleting gift', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete gift',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
