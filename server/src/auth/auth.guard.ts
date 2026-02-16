import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHash =
      request.headers['x-auth-hash'] || request.headers['X-Auth-Hash'];

    if (!authHash) {
      throw new UnauthorizedException('Authentication hash is required');
    }

    if (!this.authService.validateHash(authHash)) {
      throw new UnauthorizedException('Invalid authentication hash');
    }

    return true;
  }
}
