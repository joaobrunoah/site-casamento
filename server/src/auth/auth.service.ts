import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly adminHash: string;

  constructor() {
    const adminUser = process.env.ADMIN_USER || '';
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    const concatenated = `${adminUser}${adminPassword}`;
    this.adminHash = crypto
      .createHash('sha256')
      .update(concatenated)
      .digest('hex');
  }

  generateAdminHash(): string {
    return this.adminHash;
  }

  validateHash(authHash: string): boolean {
    return authHash === this.adminHash;
  }

  validateCredentials(user: string, password: string): boolean {
    const validUser = process.env.ADMIN_USER;
    const validPassword = process.env.ADMIN_PASSWORD;

    if (!validUser || !validPassword) {
      return false;
    }

    return user === validUser && password === validPassword;
  }
}
