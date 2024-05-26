export {};

declare global {
  interface Array<T> {
    findLast<S extends T>(predicate: (value: T, index: number, obj: T[]) => value is S, thisArg?: any): S | undefined;
    findLast(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
    findLastIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number;
  }
}

Array.prototype.findLast = function findLast(this, predicate) {
  const index = this.findLastIndex(predicate);
  return this.at(index);
};

Array.prototype.findLastIndex = function findLastIndex(this, predicate) {
  let i = this.length - 1;

  while (i >= 0 && !predicate(this[i], i, this)) {
    i -= 1;
  }

  return i;
};
