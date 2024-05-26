import { type ClassValue, clsx } from "clsx";
import { useRef, useInsertionEffect, useMemo } from "react";
import { twMerge } from "tailwind-merge";

export type Fn = (this: unknown, ...args: never[]) => unknown;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// https://stackoverflow.com/a/76514983
export function useEffectEvent<T extends Fn>(fn: T): T {
  const ref = useRef<T | null>(null);

  useInsertionEffect(() => {
    ref.current = fn;
  }, [fn]);

  return useMemo(() => {
    return function (...args) {
      return ref.current!.apply(this, args);
    } as T;
  }, []);
}
