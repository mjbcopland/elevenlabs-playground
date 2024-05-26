export function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function* enumerate<T>(values: ArrayLike<T>) {
  for (let i = 0; i < values.length; i += 1) {
    yield tuple(i, values[i]);
  }
}

export function tuple<T extends unknown[]>(...values: T): T {
  return Array.from(values) as T;
}

export function zip<T, U>(left: ArrayLike<T>, right: ArrayLike<U>): Array<[T, U]> {
  const length = Math.min(left.length, right.length);
  return Array.from({ length }, (_, i) => {
    return tuple(left[i], right[i]);
  });
}

export function* reversed<T>(iterable: Iterable<T>) {
  yield* Array.from(iterable).reverse();
}

declare global {
  type Nullable = null | undefined;
}

export function isNullable(value: unknown): value is Nullable {
  return value === null || value === undefined;
}

export function nonNullable<T>(value: T): NonNullable<T> {
  if (isNullable(value)) throw new TypeError("Nullable");
  return value as NonNullable<T>;
}
