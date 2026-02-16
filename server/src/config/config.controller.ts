import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { FirebaseService } from '../firebase/firebase.service';
import { FieldValue } from 'firebase-admin/firestore';

@Controller()
export class ConfigController {
  constructor(
    private firebaseService: FirebaseService,
    private authService: AuthService,
  ) {}

  @Get('getConfig')
  async getConfig() {
    try {
      const db = this.firebaseService.getFirestore();
      const configDoc = await db.collection('config').doc('config').get();

      if (!configDoc.exists) {
        // Create default config if it doesn't exist
        const defaultConfig = {
          'show-confirmation-form': false,
          'show-gifts-list': false,
        };
        await db.collection('config').doc('config').set(defaultConfig);
        return { success: true, config: defaultConfig };
      }

      return { success: true, config: configDoc.data() };
    } catch (error) {
      console.error('Error fetching config', error);
      throw new HttpException(
        'Erro ao buscar configuração',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('updateConfig')
  @UseGuards(AuthGuard)
  async updateConfig(@Body() updateData: any) {
    try {
      if (!updateData || typeof updateData !== 'object') {
        throw new HttpException('Dados inválidos', HttpStatus.BAD_REQUEST);
      }

      const db = this.firebaseService.getFirestore();
      await db
        .collection('config')
        .doc('config')
        .set(updateData, { merge: true });
      const updatedDoc = await db.collection('config').doc('config').get();

      return { success: true, config: updatedDoc.data() };
    } catch (error) {
      console.error('Error updating config', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Erro ao atualizar configuração',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('login')
  async login(@Body() body: { user: string; password: string }) {
    try {
      const { user, password } = body;

      if (!user || !password) {
        throw new HttpException(
          'Usuário e senha são obrigatórios',
          HttpStatus.BAD_REQUEST,
        );
      }

      const validUser = process.env.ADMIN_USER;
      const validPassword = process.env.ADMIN_PASSWORD;

      if (!validUser || !validPassword) {
        console.error('Admin credentials not configured in environment');
        throw new HttpException(
          'Configuração do servidor inválida',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (user === validUser && password === validPassword) {
        return {
          success: true,
          message: 'Login realizado com sucesso',
          hash: this.authService.generateAdminHash(),
        };
      } else {
        throw new HttpException(
          'Usuário ou senha incorretos',
          HttpStatus.UNAUTHORIZED,
        );
      }
    } catch (error) {
      console.error('Error in login', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Erro ao processar login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
