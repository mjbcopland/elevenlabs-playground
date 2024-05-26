import { Dispatch } from "react";

interface AbortOptions {
  signal?: AbortSignal;
}

export async function* generate<T>(callback: Dispatch<Dispatch<IteratorResult<T>>>, options?: AbortOptions) {
  const queue: Array<Promise<IteratorResult<T>>> = [];
  let push: Dispatch<IteratorResult<T>>;

  const next = (): void => {
    const promise = new Promise((resolve: Dispatch<IteratorResult<T>>) => {
      push = resolve;
    });

    queue.push(promise);
  };

  next();
  callback((data) => {
    push(data);
    next();
  });

  for (let i = 0; true; i += 1) {
    const result = await queue[i];
    delete queue[i];

    if (result.done) {
      break; // return
    }

    if (options?.signal?.aborted ?? false) {
      break; // throw new Error("Aborted")
    }

    yield result.value;
  }
}
