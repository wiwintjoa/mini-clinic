import { BadRequestException } from '@nestjs/common';
import { calculateInvoiceTotals } from './billing.service';

describe('calculateInvoiceTotals', () => {
  it('uses integer cents for stable totals', () => expect(calculateInvoiceTotals([{ type: 'MEDICINE', description: 'Medicine', quantity: 3, unitPrice: 12.34 }], 2, 1)).toEqual({ subtotal: '37.02', discount: '2.00', tax: '1.00', grandTotal: '36.02' }));
  it('rejects a discount greater than the payable amount', () => expect(() => calculateInvoiceTotals([{ type: 'SERVICE', description: 'Visit', quantity: 1, unitPrice: 10 }], 11, 0)).toThrow(BadRequestException));
});
