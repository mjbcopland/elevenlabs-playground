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
