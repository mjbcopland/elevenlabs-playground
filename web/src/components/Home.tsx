import { useMutation } from "@tanstack/react-query";
import { Dispatch, useEffect, useMemo, useRef, useState } from "react";
import * as Slate from "slate";
import { Descendant, Operation } from "slate";
import { RichTextEditor } from "./rich-text/RichTextEditor";
import { Fn, cn, useEffectEvent } from "../util/react";
import { RichText } from "./rich-text/RichText";
import { RichTextArea } from "./rich-text/RichTextArea";
import { enumerate, nonNullable, reversed, zip } from "../util/misc";
import { generate } from "../util/generators";
import { HTTPError } from "../errors";
import * as Lucide from "lucide-react";

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
  const url = `/api/snapshot`;

  const data = {
    text: text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  };

  Promise.try(async () => {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
      headers: new Headers([["content-type", "application/json"]]),
    });

    if (!response.ok) {
      throw new HTTPError(response.status);
    }

    for await (const line of response.lines()) {
      if (!line) continue; // skip keepalive newlines

      const value = JSON.parse(line);

      const bytes = base64ToBytes(value["audio_base64"]);
      const buffer = await audioContext.decodeAudioData(bytes.buffer);

      if (value["alignment"]) {
        const characters = value["alignment"]["characters"];
        const timestamps = value["alignment"]["character_start_times_seconds"];

        const groups = [[]];

        for (const [c, t] of zip(characters, timestamps)) {
          if (c === " ") {
            groups.push([]);
          }

          groups[groups.length - 1].push([c, t]);
        }

        const words = groups.map((group) => {
          return group.map((g) => g[0]).join("");
        });

        const wordTimestamps = groups.map((group) => {
          return group[0][1];
        });

        onData(buffer, words, wordTimestamps, false);
        continue;
      }

      onData(buffer, [], [], false);
    }

    const empty = audioContext.createBuffer(1, 1, audioContext.sampleRate);
    onData(empty, [], [], true);
  }).catch(console.error);
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

type WalkerNextFn<T, U = void> = (node: T, state: U) => void;
type WalkerBase<T, U = void> = (node: T, state: U, next: WalkerNextFn<T, U>) => void;

type WalkerCallback<T, U = void> = (node: T, state: U) => void;

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
  { type: "paragraph", children: [{ text: "You have selected Microsoft Sam as the computer's default voice." }] },
];

export default function Home() {
  const editor = useRef<Slate.Editor>(null);

  const [value, setValue] = useState(initialValue);

  const onChange = useEffectEvent((value: Descendant[], options?: { operation?: Operation }) => {
    if (options?.operation?.type !== "set_selection") setValue(value);
  });

  // Note: this uses the same type as Slate.Range but the offset is from the root, not the associated path
  const [activeRange, setActiveRange] = useState((): Slate.Range | undefined => undefined);

  const textValues = useMemo(() => {
    const nodes: Array<{ text: string; path: Slate.Path; offset: number }> = [];
    const root: Slate.NodeEntry = [{ children: value }, []];

    const base: WalkerBase<Slate.NodeEntry> = (entry, state, next) => {
      const children = "children" in entry[0] ? entry[0].children : [];
      for (const [index, child] of reversed(enumerate(children))) {
        next([child, entry[1].concat(index)]);
      }
    };

    let offset = 0;
    const walker: WalkerCallback<Slate.NodeEntry> = ([node, path]) => {
      if (Slate.Element.isElement(node) && node.type === "paragraph") {
        nodes.push({ text: "\n", path, offset });
        offset += 1;
      }

      if (Slate.Text.isText(node)) {
        nodes.push({ text: node.text, path, offset });
        offset += node.text.length;
      }
    };

    void walk(root, walker, base, undefined);
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
      for await (const chunk of startStreaming(variables.text, { signal: abortController.current.signal })) {
        for (const [word, wordStartTime] of zip(chunk.words, chunk.wordStartTimes)) {
          const timeout = setTimeout(setActiveRange, wordStartTime * 1000, {
            focus: { path: [], offset: offset + word.length },
            anchor: { path: [], offset: offset },
          });

          offset += word.length;
          abortController.current.signal.addEventListener("abort", () => {
            clearTimeout(timeout);
          });
        }

        await playAudio(chunk.buffer, { signal: abortController.current.signal });
      }

      console.log("done");
      setActiveRange(undefined);
    },
  });

  useEffect(() => {
    if (mutation.error) console.error(mutation.error);
  }, [mutation.error]);

  const onPlay = useEffectEvent(() => {
    mutation.mutate({ text });
  });

  const decorate = (node: Slate.Node, path: Slate.Path, editor: Slate.Editor): Slate.Range[] => {
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

        const ranges: Slate.Range[] = [];
        const intersection = Slate.Range.intersection(range, newRange) ?? undefined;

        if (intersection !== undefined) ranges.push({ ...intersection, highlight: true });

        ranges.push({ ...Slate.range(editor, Slate.Range.end(newRange), Slate.Range.end(range)), muted: true });

        return ranges;
      }
    }

    return [];
  };

  const placeholder = "Start typing here or paste any text you want to turn into lifelike speech...";

  return (
    <main className="max-w-screen-lg mx-auto my-32 w-full">
      <section className="card max-w-prose mx-auto p-4 rounded-2xl w-full flex flex-col gap-4">
        <div role="heading" className="font-bold text-xs uppercase">
          Text to Speech
        </div>

        <div className="border-l border-b border-border" />

        <RichTextEditor ref={editor} value={value} onChange={onChange}>
          <RichTextArea
            decorate={decorate}
            placeholder={placeholder}
            readOnly={mutation.isPending}
            className="max-h-[160px] overflow-auto text-lg"
          />
        </RichTextEditor>

        <div className="flex flex-row-reverse items-center gap-4">
          <button className="relative rounded-full" onClick={onPlay} disabled={mutation.isPending}>
            <Lucide.LoaderCircle className={cn("absolute animate-spin", { hidden: !mutation.isPending })} />
            <span className={cn({ invisible: mutation.isPending })}>Generate speech</span>
          </button>

          <span className={cn("text-sm", { "text-destructive": text.length > MAX_LEN })}>
            {text.length} / {MAX_LEN}
          </span>
        </div>
      </section>
    </main>
  );
}
