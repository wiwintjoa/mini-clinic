import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { AuthenticatedUser } from './auth.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    const user = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user;
    if (required.every((permission) => user.permissions.includes(permission))) return true;
    throw new ForbiddenException('Insufficient permission');
  }
}
