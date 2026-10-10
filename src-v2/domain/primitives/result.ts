/** Native immutable diagnostics; no implicit replacement value. */
export interface DomainError { readonly code: string; readonly path: string; readonly message: string }
export type DomainResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly DomainError[] };
export function success<T>(value: T): DomainResult<T> { return Object.freeze({ ok: true, value }); }
export function error(code: string, path: string, message: string): DomainError {
  return Object.freeze({ code, path, message });
}
export function failure<T>(errors: readonly DomainError[]): DomainResult<T> {
  return Object.freeze({ ok: false, errors: Object.freeze(errors.map(e => error(e.code, e.path, e.message))) });
}
export function invalid<T>(code: string, path: string, message = code): DomainResult<T> {
  return failure([error(code, path, message)]);
}
