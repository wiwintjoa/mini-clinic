import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
describe('PermissionsGuard', () => {
  const context = (permissions: string[]) => ({ switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }), getHandler: () => null, getClass: () => null }) as unknown as ExecutionContext;
  it('allows required permission', () => { const reflector = { getAllAndOverride: () => ['PATIENT_CREATE'] } as unknown as Reflector; expect(new PermissionsGuard(reflector).canActivate(context(['PATIENT_CREATE']))).toBe(true); });
  it('rejects missing permission', () => { const reflector = { getAllAndOverride: () => ['USER_MANAGE'] } as unknown as Reflector; expect(() => new PermissionsGuard(reflector).canActivate(context([]))).toThrow(ForbiddenException); });
});
