import { jsonb, pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { users } from './index';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: uuid('entity_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('audit_logs_entity_idx').on(table.entity, table.entityId), index('audit_logs_user_idx').on(table.userId), index('audit_logs_created_idx').on(table.createdAt)]);
