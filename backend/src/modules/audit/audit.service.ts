import { Inject, Injectable } from '@nestjs/common';
import { count, desc, ilike, or } from 'drizzle-orm';
import { DATABASE, Database } from '../../database/database.module';
import { auditLogs } from '../../database/schema/audit';
import { AuditListQueryDto } from './audit.dto';

export type AuditContext = { userId: string; ipAddress?: string; userAgent?: string };

@Injectable()
export class AuditService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}
  async log(input: AuditContext & { action: string; entity: string; entityId?: string; oldValue?: unknown; newValue?: unknown }) {
    await this.db.insert(auditLogs).values({ userId: input.userId, action: input.action, entity: input.entity, entityId: input.entityId, oldValue: input.oldValue, newValue: input.newValue, ipAddress: input.ipAddress, userAgent: input.userAgent });
  }
  async list(query: AuditListQueryDto) {
    const filter = query.search ? or(ilike(auditLogs.action, `%${query.search}%`), ilike(auditLogs.entity, `%${query.search}%`)) : undefined;
    const [data, totals] = await Promise.all([this.db.select().from(auditLogs).where(filter).orderBy(desc(auditLogs.createdAt)).limit(query.limit).offset((query.page - 1) * query.limit), this.db.select({ value: count() }).from(auditLogs).where(filter)]);
    const total = totals[0]?.value ?? 0; return { data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }
}
