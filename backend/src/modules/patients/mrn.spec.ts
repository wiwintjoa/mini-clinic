import { formatMrn } from './mrn';
describe('formatMrn', () => {
  it('uses the clinic prefix and six digits', () => expect(formatMrn(42)).toBe('CLN-000042'));
  it('does not truncate larger counters', () => expect(formatMrn(1_000_000)).toBe('CLN-1000000'));
});
