import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE, Database } from '../../database/database.module';
import { invoices, payments } from '../../database/schema/billing';
import { AuditContext, AuditService } from '../audit/audit.service';
import { CreatePaymentDto } from './payment.dto';

@Injectable()
export class PaymentsService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly audit: AuditService) {}
  async create(dto: CreatePaymentDto, context: AuditContext) {
    const result = await this.db.transaction(async (tx) => {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, dto.invoiceId)).for('update').limit(1);
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (['PAID', 'REFUNDED', 'CANCELLED'].includes(invoice.status)) throw new BadRequestException(`Cannot pay a ${invoice.status.toLowerCase()} invoice`);
      const outstanding = Number(invoice.grandTotal) - Number(invoice.amountPaid);
      if (dto.amount > outstanding) throw new ConflictException(`Payment exceeds outstanding balance ${outstanding.toFixed(2)}`);
      const timestamp = new Date();
      const paymentNumber = `PAY-${timestamp.toISOString().replace(/\D/g, '').slice(0, 14)}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const [payment] = await tx.insert(payments).values({ invoiceId: dto.invoiceId, paymentNumber, amount: dto.amount.toFixed(2), method: dto.method, reference: dto.reference, receivedBy: context.userId }).returning();
      const amountPaid = Number(invoice.amountPaid) + dto.amount;
      const [updatedInvoice] = await tx.update(invoices).set({ amountPaid: amountPaid.toFixed(2), status: amountPaid === Number(invoice.grandTotal) ? 'PAID' : 'PARTIAL', updatedAt: timestamp }).where(eq(invoices.id, invoice.id)).returning();
      return { payment, invoice: updatedInvoice, balance: (Number(updatedInvoice.grandTotal) - Number(updatedInvoice.amountPaid)).toFixed(2) };
    });
    await this.audit.log({ ...context, action: 'PAYMENT_CREATE', entity: 'payments', entityId: result.payment.id, newValue: result });
    return result;
  }
}
