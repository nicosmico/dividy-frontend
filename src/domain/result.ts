import type { DomainError, DomainErrorCode, Result } from './types';

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(
  code: DomainErrorCode,
  message: string
): Result<T> {
  const error: DomainError = { code, message };
  return { ok: false, error };
}
