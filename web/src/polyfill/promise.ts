import { Fn } from "../util/react";

declare global {
  interface PromiseConstructor {
    try<T extends Fn>(callback: T, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>>;
  }
}

Promise.try = function (callback, ...args) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Promise((resolve) => resolve(callback.apply(this, args) as any));
};
