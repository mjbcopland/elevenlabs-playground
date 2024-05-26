import { useMutation, useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { Descendant, Operation } from "slate";
import { Slate as SlateProvider } from "slate-react";
import { RichTextEditor } from "./rich-text/RichTextEditor";
import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { RichText } from "./rich-text/RichText";
import { RichTextArea } from "./rich-text/RichTextArea";

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

  const audioBuffer = audioContext.createBuffer(1, Math.ceil(length / 2), 44100);
  const channelData = audioBuffer.getChannelData(0);
  console.log("byte length", data.byteLength);
  console.log("channel length", channelData.length);
  for (let i = 0; i < data.byteLength - 1; i += 2) {
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

export default function HistoryItem() {
  const params = useParams();

  const query = useSuspenseQuery({
    queryKey: ["history", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/history/${params.id}`, {
        method: "GET",
      });

      return response.json();
    },
  });

  const value = useMemo((): RichText => {
    return query.data.text.split("\n").map((text) => {
      return { type: "paragraph", children: [{ text }] };
    });
  }, []);

  const mutation = useMutation({
    mutationFn: async (variables: { text: string }) => {
      const response = await fetch(`/api/v1/history/${params.id}/audio`, {
        method: "GET",
      });

      return response.blob();
    },
  });

  const onPlay = async () => {
    const file = await mutation.mutateAsync({ text: "Hello, world!" });
    new Audio(URL.createObjectURL(file)).play();
  };

  return (
    <main className="max-w-screen-lg mx-auto w-full p-8">
      <section className="max-w-prose mx-auto w-full">
        <div className="flex flex-col gap-2">
          <RichTextEditor value={value}>
            <RichTextArea readOnly />
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
