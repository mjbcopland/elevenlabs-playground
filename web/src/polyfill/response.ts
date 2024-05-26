import { nonNullable } from "../util/misc";

declare global {
  interface Response {
    lines(): AsyncIterable<string>;
  }
}

Response.prototype.lines = async function* lines() {
  const decoder = new TextDecoder();
  const splitter = /\r?\n/; // newlines
  const reader = this.body!.getReader();

  let text = "";

  while (true) {
    const result = await reader.read();

    if (result.done) {
      break;
    }

    text += decoder.decode(result.value, { stream: true });

    const chunks = text.split(splitter);

    // the final chunk may be partial; keep it as the current text
    text = nonNullable(chunks.pop());

    for (const chunk of chunks) {
      yield chunk;
    }
  }

  yield text;
};
