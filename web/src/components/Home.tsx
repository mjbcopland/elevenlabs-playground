import { useMutation } from "@tanstack/react-query";
import { ChangeEvent, useEffect, useLayoutEffect, useState } from "react";
import { HTTPError } from "../errors";
import lines from "../static/snapshot.json";
import * as Slate from "slate";
import { Descendant, Editor, Operation, createEditor, isEditor } from "slate";
import { withHistory } from "slate-history";
import { Editable, RenderElementProps, RenderLeafProps, Slate as SlateProvider, withReact } from "slate-react";
import { RichText, RichTextArea, RichTextEditor } from "./rich-text/RichTextEditor";

const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

const audioContext = new AudioContext();

function base64ToArrayBuffer(base64: string) {
  const binaryData = atob(base64);

  const arrayBuffer = new ArrayBuffer(binaryData.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < binaryData.length; i++) uint8Array[i] = binaryData.charCodeAt(i);

  return { arrayBuffer, length: uint8Array.length };
}

function createAudioBuffer(arrayBuffer: ArrayBuffer, length: number) {
  const data = new DataView(arrayBuffer);

  const audioBuffer = audioContext.createBuffer(1, length / 2, audioContext.sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < data.byteLength; i += 2) {
    const sample = data.getInt16(i, true);
    channelData[i / 2] = sample / 32768;
  }

  return audioBuffer;
}

function base64ToArrayBuffer2(base64: string) {
  const data = Array.from(atob(base64), (value) => {
    return value.charCodeAt(0);
  });

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

type DataCallback = (buffer: AudioBuffer, words: string[], wordStartTimes: number[], done: boolean) => void;

function startStreaming(text: string, onData: DataCallback) {
  for (const line of lines) {
    const buffer = createAudioBuffer();
    // onData(line.audio_base64, false);
  }
}

export default function Home() {
  const [value, setValue] = useState((): RichText => {
    return [{ type: "paragraph", children: [{ text: "" }] }];
  });

  const onChange = (value: Descendant[], options?: { operation?: Operation }) => {
    if (options?.operation?.type !== "set_selection") setValue(value);
  };

  const mutation = useMutation({
    mutationFn: async (variables: { text: string }) => {
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

      const blobParts: BlobPart[] = [];

      const characters = [];
      const character_start_times_seconds = [];
      const character_end_times_seconds = [];

      for (const line of lines) {
        // filter out keep-alive new line

        // parse the JSON string and load the data as a dictionary
        // const data = JSON.parse(line);
        const data = line;

        // the "audio_base64" entry in the dictionary contains the audio as a base64 encoded string,
        // we need to decode it into bytes in order to save the audio as a file
        const chunk = data["audio_base64"];

        // const { arrayBuffer, length } = base64ToArrayBuffer(chunk);

        const binary = base64ToArrayBuffer2(chunk);
        const buffer = binary.buffer;

        const audioBuffer = createAudioBuffer(binary.buffer, buffer.byteLength);

        // const audioBuffer = await audioContext.decodeAudioData(binary);

        const blob = new Blob([binary], { type: "audio/mpeg" });
        new Audio(URL.createObjectURL(blob)).play();

        const source = audioContext.createBufferSource();

        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        // source.start();

        blobParts.push(chunk);

        if (data["alignment"]) {
          characters.push(data["alignment"]["characters"]);
          character_start_times_seconds.push(data["alignment"]["character_start_times_seconds"]);
          character_end_times_seconds.push(data["alignment"]["character_end_times_seconds"]);
        }
      }

      const output = new Blob(blobParts, {
        type: "audio/mpeg",
      });

      console.log({
        characters: characters,
        character_start_times_seconds: character_start_times_seconds,
        character_end_times_seconds: character_end_times_seconds,
      });
    },
  });

  const onPlay = () => {
    mutation.mutate({ text: "Hello, world!" });
  };

  return (
    <main className="max-w-screen-lg mx-auto w-full p-8">
      <section className="max-w-prose mx-auto w-full">
        <div className="flex flex-col gap-2">
          <RichTextEditor value={value} onChange={onChange}>
            <RichTextArea />
          </RichTextEditor>

          <div className="flex flex-row-reverse">
            <button className="button-icon rounded-full" onClick={onPlay}>
              Play
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
