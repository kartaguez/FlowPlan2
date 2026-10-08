/** Preserve immediate characterization adapters while production commits asynchronously. */
export type MaybePromise<T> = T | Promise<T>;
export function mapResult<T, U>(value: MaybePromise<T>, next: (value: T) => U): MaybePromise<U> {
  return typeof (value as { then?: unknown } | null)?.then === "function" ? Promise.resolve(value).then(next) : next(value as T);
}
