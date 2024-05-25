export function assert(value: unknown): asserts value {
  if (!Boolean(value)) throw new TypeError();
}
