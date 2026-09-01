import { postgresErrorCode } from './postgres-error';
describe('postgresErrorCode', () => {
  it('reads a direct postgres error', () => expect(postgresErrorCode({ code: '23505' })).toBe('23505'));
  it('unwraps a Drizzle query error cause', () => expect(postgresErrorCode({ cause: { code: '23505' } })).toBe('23505'));
  it('returns undefined for unrelated errors', () => expect(postgresErrorCode(new Error('no code'))).toBeUndefined());
});
