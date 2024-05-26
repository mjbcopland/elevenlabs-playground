import { useMutation } from "@tanstack/react-query";
import { Dispatch, useEffect, useMemo, useRef, useState } from "react";
import lines from "../static/snapshot.json";
import * as Slate from "slate";
import { Descendant, Operation } from "slate";
import { ReactEditor } from "slate-react";
import { RichTextEditor } from "./rich-text/RichTextEditor";
import { cn, useEffectEvent } from "../util/react";
import { RichText } from "./rich-text/RichText";
import { RichTextArea } from "./rich-text/RichTextArea";
import { enumerate, zip } from "../util/misc";
import { generate } from "../util/generators";

const MAX_LEN = 5000; // free tier
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

const audioContext = new AudioContext();

function base64ToBytes(base64: string): Uint8Array {
  function* bytes(data: string): Iterable<number> {
    for (let i = 0; i < data.length; i += 1) {
      yield data.charCodeAt(i);
    }
  }

  const data = bytes(atob(base64));
  return new Uint8Array(data);
}

declare global {
  interface Response {
    lines(): AsyncIterable<string>;
  }
}

Response.prototype.lines = async function* lines() {
  const text = await this.text();
  yield* text.split("\n");
};

type DataChunk = { buffer: AudioBuffer; words: string[]; wordStartTimes: number[] };
type DataCallback = (buffer: AudioBuffer, words: string[], wordStartTimes: number[], done: boolean) => void;

function startStreaming(text: string, options?: AbortOptions): AsyncGenerator<DataChunk>;
function startStreaming(text: string, onData: DataCallback): void;

function startStreaming(text: string, options?: AbortOptions | DataCallback) {
  if (options === undefined || typeof options !== "function") {
    return generate((push: Dispatch<IteratorResult<DataChunk>>) => {
      startStreaming(text, (buffer, words, wordStartTimes, done) => {
        push({ done: false, value: { buffer, words, wordStartTimes } });
        if (done) push({ done, value: undefined });
      });
    }, options);
  }

  const onData = options;

  // const url = `/api/v1/text-to-speech/${VOICE_ID}/stream/with-timestamps`;

  // const data = {
  //   text: variables.text,
  //   model_id: "eleven_multilingual_v2",
  //   voice_settings: {
  //     stability: 0.5,
  //     similarity_boost: 0.75,
  //   },
  // };

  // const response = await fetch(url, {
  //   method: "POST",
  //   body: JSON.stringify(data),
  //   headers: new Headers([["content-type", "application/json"]]),
  // });

  // if (!response.ok) {
  //   throw new HTTPError(response.status);
  // }

  // console.log(await response.text());
  // return;

  Promise.resolve().then(async () => {
    for (const line of lines) {
      const bytes = base64ToBytes(line["audio_base64"]);
      const buffer = await audioContext.decodeAudioData(bytes.buffer);

      // if (data["alignment"]) {
      //   characters.push(data["alignment"]["characters"]);
      //   character_start_times_seconds.push(data["alignment"]["character_start_times_seconds"]);
      //   character_end_times_seconds.push(data["alignment"]["character_end_times_seconds"]);
      // }

      if (line["alignment"]) {
        const words = line["alignment"]["characters"];
        const timestamps = line["alignment"]["character_start_times_seconds"];
        onData(buffer, words, timestamps, false);
        continue;
      }

      onData(buffer, [], [], false);
    }

    const empty = audioContext.createBuffer(1, 1, audioContext.sampleRate);
    onData(empty, [], [], true);
  });
}

interface AbortOptions {
  signal?: AbortSignal;
}

const playAudio = (buffer: AudioBuffer, options?: AbortOptions) => {
  const source = audioContext.createBufferSource();

  return new Promise((resolve: Dispatch<void>) => {
    options?.signal?.addEventListener("abort", () => {
      source.stop();
    });

    source.addEventListener("ended", () => {
      resolve();
    });

    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  });
};

function* reversed<T>(iterable: Iterable<T>) {
  yield* Array.from(iterable).reverse();
}

type Nullable = null | undefined;

function isNullable(value: unknown): value is Nullable {
  return value === null || value === undefined;
}

function nonNullable<T>(value: T): NonNullable<T> {
  if (isNullable(value)) throw new TypeError("Nullable");
  return value as NonNullable<T>;
}

type WalkerNextFn<T, U> = (node: T, state: U) => void;
type WalkerBase<T, U> = (node: T, state: U, next: WalkerNextFn<T, U>) => void;

type WalkerCallback<T, U> = (node: T, state: U) => void;

function walk<T, U>(node: T, callback: WalkerCallback<T, U>, base: WalkerBase<T, U>, state: U) {
  const stack = [{ type: "enter", node, state }];

  while (stack.length > 0) {
    const value = nonNullable(stack.pop());

    if (value.type === "enter") {
      stack.push({ type: "leave", node: value.node, state: value.state });

      base(value.node, value.state, (node, state) => {
        stack.push({ type: "enter", node, state });
      });
    }

    if (value.type === "leave") {
      callback(value.node, value.state);
    }
  }
}

// const initialValue: RichText = [{ type: "paragraph", children: [{ text: "" }] }];
const initialValue: RichText = [
  { type: "paragraph", children: [{ text: "Hello," }] },
  { type: "paragraph", children: [{ text: "world!" }] },
];

export default function Home() {
  const editor = useRef<Slate.Editor>(null);

  const [value, setValue] = useState(initialValue);

  const onChange = useEffectEvent((value: Descendant[], options?: { operation?: Operation }) => {
    if (options?.operation?.type !== "set_selection") setValue(value);
  });

  const [activeRange, setActiveRange] = useState((): Slate.Range | undefined => {
    return undefined;
  });

  const textValues = useMemo(() => {
    // Like Pick<Slate.Node, "children">
    type Node = Slate.Text | { children: Slate.Descendant[] };

    const nodes: Array<{ text: string; path: Slate.Path; offset: number }> = [];
    let offset = 0;

    const root: Node = { children: value };
    const state: Slate.Path = [];

    const base: WalkerBase<Node, Slate.Path> = (node, state, next) => {
      const children = "children" in node ? node.children : [];
      for (const [index, child] of reversed(enumerate(children))) {
        next(child, state.concat(index));
      }
    };

    walk(
      root,
      (node, path) => {
        if (Slate.Element.isElement(node) && node.type === "paragraph") {
          nodes.push({ text: "\n", path, offset });
          offset += 1;
        }

        if (Slate.Text.isText(node)) {
          nodes.push({ text: node.text, path, offset });
          offset += node.text.length;
        }
      },
      base,
      state,
    );

    return nodes;
  }, [value]);

  const text = useMemo((): string => {
    const texts = textValues.map((value) => value.text);
    return texts.slice(0, -1).join(""); // trim trailing newline
  }, [textValues]);

  const abortController = useRef<AbortController | undefined>(undefined);

  const mutation = useMutation({
    mutationFn: async (variables: { text: string }) => {
      if (abortController.current !== undefined) {
        abortController.current.abort();
      }

      abortController.current = new AbortController();

      let offset = 0;
      for await (const chunk of startStreaming(variables.text, { signal: abortController.current!.signal })) {
        for (const [index, [word, wordStartTime]] of enumerate(zip(chunk.words, chunk.wordStartTimes))) {
          const timeout = setTimeout(setActiveRange, wordStartTime * 1000, {
            anchor: { path: [], offset: offset + index },
            focus: { path: [], offset: offset + index + word.length },
          });

          abortController.current.signal.addEventListener("abort", () => {
            clearTimeout(timeout);
          });
        }

        offset += chunk.wordStartTimes.length;
        await playAudio(chunk.buffer, { signal: abortController.current.signal });
      }

      setActiveRange(undefined);
    },
  });

  useEffect(() => {
    if (mutation.error) console.log(mutation.error);
  }, [mutation.error]);

  const onPlay = useEffectEvent(() => {
    mutation.mutate({ text });
  });

  const decorate = (node: Slate.Node, path: Slate.Path, editor: Slate.Editor) => {
    const range = Slate.Editor.range(editor, path);

    if (Slate.Text.isText(node) && activeRange) {
      const start = textValues.findLast((value) => {
        return value.offset <= activeRange.anchor.offset;
      });

      const end = textValues.find((value) => {
        return activeRange.focus.offset <= value.offset + value.text.length;
      });

      if (start && end) {
        const newRange: Slate.Range = {
          anchor: { path: start.path, offset: activeRange.anchor.offset - start.offset },
          focus: { path: end.path, offset: activeRange.focus.offset - end.offset },
        };

        const intersection = Slate.Range.intersection(range, newRange) ?? undefined;
        if (intersection !== undefined) return [{ ...intersection, style: { highlight: true } }];
      }
    }

    return [];
  };

  return (
    <main className="max-w-screen-lg mx-auto my-32 w-full">
      <section className="card max-w-prose mx-auto p-4 rounded-2xl w-full flex flex-col gap-4">
        <div role="heading" className="font-bold text-xs uppercase">
          Text to Speech
        </div>

        <div className="border-l border-b border-border" />

        <RichTextEditor ref={editor} value={value} onChange={onChange}>
          <RichTextArea
            _decorate={decorate}
            placeholder="Start typing..."
            readOnly={mutation.isPending}
            className="max-h-[160px] overflow-auto"
          />
        </RichTextEditor>

        <div className="flex flex-row-reverse items-center gap-4">
          <button className="rounded-full" onClick={onPlay}>
            Generate speech
          </button>

          <span className={cn("text-sm", text.length > MAX_LEN && "text-red-600")}>
            {text.length} / {MAX_LEN}
          </span>
        </div>
      </section>
    </main>
  );
}

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
