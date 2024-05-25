import * as Slate from "slate";

export class SlateChangeEvent extends Event {
  public readonly operation: Slate.Operation | undefined;

  public constructor(type: "change", { operation, ...init }: any) {
    super(type, init);
    this.operation = operation;
  }
}

export const withEvents = <T extends Slate.Editor>(editor: T): T => {
  const target = Object.assign(new EventTarget(), {
    value: editor,
  });

  const prev = editor.onChange;
  editor.onChange = function onChange(options) {
    const event = new SlateChangeEvent("change", {
      operation: options?.operation,
    });

    void target.dispatchEvent(event);
    return prev.call(this, options);
  };

  // NB: mutates editor
  return Object.assign(editor, {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  });
};
