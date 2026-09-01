import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { UsersService } from '../../modules/users/users.service';
import type { AccessTokenPayload } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly config: ConfigService, private readonly users: UsersService) {}
  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: unknown }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Authentication required');
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, { secret: this.config.getOrThrow('JWT_SECRET') });
      if (payload.type !== 'access') throw new Error('Invalid token type');
      request.user = await this.users.getAuthenticatedUser(payload.sub);
      return true;
    } catch { throw new UnauthorizedException('Invalid or expired access token'); }
  }
}
