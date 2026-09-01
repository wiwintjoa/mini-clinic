export function postgresErrorCode(error: unknown, depth = 0): string | undefined {
  if (depth > 4 || typeof error !== 'object' || error === null) return undefined;
  if ('code' in error && typeof error.code === 'string') return error.code;
  return 'cause' in error ? postgresErrorCode(error.cause, depth + 1) : undefined;
}
