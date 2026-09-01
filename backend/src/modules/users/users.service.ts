import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { hash } from 'argon2';
import { and, eq } from 'drizzle-orm';
import { DATABASE, Database } from '../../database/database.module';
import { permissions, rolePermissions, roles, users } from '../../database/schema';
import { patients } from '../../database/schema/patients';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { postgresErrorCode } from '../../database/postgres-error';
import { AuditContext, AuditService } from '../audit/audit.service';
import { CreatePatientAccountDto } from './user.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly audit: AuditService) {}
  async findForLogin(email: string) {
    const [record] = await this.db.select().from(users).where(and(eq(users.email, email.toLowerCase()), eq(users.isActive, true))).limit(1);
    return record;
  }
  async getAuthenticatedUser(id: string): Promise<AuthenticatedUser> {
    const [identity] = await this.db.select({ id: users.id, email: users.email, fullName: users.fullName, roleId: roles.id, role: roles.name }).from(users).innerJoin(roles, eq(users.roleId, roles.id)).where(and(eq(users.id, id), eq(users.isActive, true))).limit(1);
    if (!identity) throw new UnauthorizedException('Account is unavailable');
    const grants = await this.db.select({ name: permissions.name }).from(rolePermissions).innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id)).where(eq(rolePermissions.roleId, identity.roleId));
    return { id: identity.id, email: identity.email, fullName: identity.fullName, role: identity.role, permissions: grants.map((grant) => grant.name) };
  }
  async createPatientAccount(dto: CreatePatientAccountDto, context: AuditContext) {
    const passwordHash = await hash(dto.password);
    try {
      const account = await this.db.transaction(async (tx) => {
        const [patient] = await tx.select().from(patients).where(eq(patients.id, dto.patientId)).for('update').limit(1);
        if (!patient) throw new NotFoundException('Patient not found');
        if (patient.portalUserId) throw new ConflictException('Patient already has a portal account');
        const [role] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.name, 'PATIENT')).limit(1);
        if (!role) throw new NotFoundException('Patient role is unavailable');
        const [created] = await tx.insert(users).values({ roleId: role.id, email: dto.email.toLowerCase(), fullName: patient.fullName, passwordHash }).returning({ id: users.id, email: users.email, fullName: users.fullName, isActive: users.isActive, createdAt: users.createdAt });
        await tx.update(patients).set({ portalUserId: created.id, email: patient.email ?? created.email, updatedAt: new Date() }).where(eq(patients.id, patient.id));
        return created;
      });
      await this.audit.log({ ...context, action: 'PATIENT_PORTAL_ACCOUNT_CREATE', entity: 'users', entityId: account.id, newValue: account });
      return account;
    } catch (error) {
      if (postgresErrorCode(error) === '23505') throw new ConflictException('Email address is already in use');
      throw error;
    }
  }
}
