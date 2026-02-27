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
import { DEFAULT_GIFTS_SEED, GiftSeedItem } from './gifts.seed-data';

@Controller()
export class GiftsController {
  constructor(private firebaseService: FirebaseService) {}

  private isStorageUrl(url: string): boolean {
    return (
      url.includes('storage.googleapis.com') ||
      url.includes('firebasestorage.googleapis.com')
    );
  }

  private sanitizeSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50);
  }

  private getFileExtensionFromUrl(url: string): string {
    const fromPath = url.split('/').pop()?.split('?')[0] ?? '';
    const ext = fromPath.includes('.') ? fromPath.split('.').pop() : '';
    if (!ext) return 'jpg';
    return ext.toLowerCase().slice(0, 10);
  }

  private async resolveGiftImageUrl(
    imageUrl: string,
    giftIdForPath: string,
    giftName: string,
  ): Promise<string> {
    if (!imageUrl || !imageUrl.startsWith('http') || this.isStorageUrl(imageUrl)) {
      return imageUrl || '';
    }

    const timestamp = Date.now();
    const sanitizedName = this.sanitizeSlug(giftName || 'gift');
    const fileExtension = this.getFileExtensionFromUrl(imageUrl);
    const destinationPath = `gifts/${giftIdForPath}-${sanitizedName}-${timestamp}.${fileExtension}`;

    try {
      return await this.firebaseService.downloadAndUploadImage(
        imageUrl,
        destinationPath,
      );
    } catch (imageError) {
      console.error('Error processing image, using original URL:', imageError);
      return imageUrl;
    }
  }

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

      let finalImageUrl = imagem || '';
      const giftIdForPath = id || `temp-${Date.now()}`;
      finalImageUrl = await this.resolveGiftImageUrl(imagem, giftIdForPath, nome);

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

  @Post('importGifts')
  @UseGuards(AuthGuard)
  async importGifts(
    @Body()
    body: {
      gifts?: GiftSeedItem[];
      replaceExisting?: boolean;
    },
  ) {
    try {
      const db = this.firebaseService.getFirestore();
      const FieldValue = this.firebaseService.getFieldValue();
      const inputGifts = body?.gifts?.length ? body.gifts : DEFAULT_GIFTS_SEED;
      const replaceExisting = body?.replaceExisting === true;

      const giftsCollection = db.collection('gifts');
      const existingSnapshot = await giftsCollection.limit(1).get();

      if (!replaceExisting && !existingSnapshot.empty) {
        return {
          success: true,
          skipped: true,
          reason: 'Gifts collection already has data',
          imported: 0,
          totalRequested: inputGifts.length,
        };
      }

      if (replaceExisting) {
        const allExisting = await giftsCollection.get();
        const deleteBatch = db.batch();
        allExisting.docs.forEach((doc) => deleteBatch.delete(doc.ref));
        if (!allExisting.empty) {
          await deleteBatch.commit();
        }
      }

      const preparedGifts = await Promise.all(
        inputGifts.map(async (gift, index) => {
          const docRef = giftsCollection.doc();
          const imageUrl = await this.resolveGiftImageUrl(
            gift.imagem || '',
            docRef.id,
            gift.nome || `gift-${index + 1}`,
          );

          return {
            docRef,
            data: {
              nome: gift.nome?.trim() || '',
              descricao: gift.descricao || '',
              preco: Number(gift.preco) || 0,
              estoque: Number(gift.estoque) || 0,
              quota: Boolean(gift.quota),
              imagem: imageUrl,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            },
          };
        }),
      );

      const writeBatch = db.batch();
      preparedGifts.forEach(({ docRef, data }) => writeBatch.set(docRef, data));
      await writeBatch.commit();

      return {
        success: true,
        skipped: false,
        imported: preparedGifts.length,
        totalRequested: inputGifts.length,
      };
    } catch (error) {
      console.error('Error importing gifts', error);
      throw new HttpException(
        'Failed to import gifts',
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
