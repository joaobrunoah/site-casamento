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

  /**
   * Returns total quantity sold per gift id from approved purchases only.
   * Used to compute disponivel = estoque - sold (inventory is calculated, not stored).
   */
  private async getSoldQuantityByGiftId(): Promise<Record<string, number>> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('purchases')
      .where('status', '==', 'approved')
      .get();
    const sold: Record<string, number> = {};
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const items = (data.gifts || []) as Array<{ id?: string; quantidade?: number }>;
      items.forEach((item) => {
        if (item.id) {
          sold[item.id] = (sold[item.id] ?? 0) + (item.quantidade ?? 1);
        }
      });
    });
    return sold;
  }

  @Get('listGifts')
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

      const data = giftDoc.data()!;
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

      // Process image: if it's a URL (not already a Firebase Storage URL), download and upload to Storage
      let finalImageUrl = imagem || '';
      
      // Determine giftId first (for existing gifts) or use a temporary identifier
      const giftIdForPath = id || `temp-${Date.now()}`;
      
      if (imagem && imagem.startsWith('http') && !imagem.includes('storage.googleapis.com') && !imagem.includes('firebasestorage.googleapis.com')) {
        try {
          // Generate a unique path for the image in Storage
          const timestamp = Date.now();
          const sanitizedNome = nome.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
          const fileExtension = imagem.split('.').pop()?.split('?')[0] || 'jpg';
          const destinationPath = `gifts/${giftIdForPath}-${sanitizedNome}-${timestamp}.${fileExtension}`;
          
          // Download and upload to Firebase Storage
          finalImageUrl = await this.firebaseService.downloadAndUploadImage(
            imagem,
            destinationPath,
          );
        } catch (imageError) {
          console.error('Error processing image, using original URL:', imageError);
          // If image processing fails, keep the original URL
          // This allows the gift to be saved even if image download fails
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
