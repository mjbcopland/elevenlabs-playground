import {
  useState,
  useLayoutEffect,
  ComponentProps,
  PropsWithChildren,
  FC,
  useImperativeHandle,
  forwardRef,
} from "react";
import * as Slate from "slate";
import { withHistory } from "slate-history";
import { Editable, Slate as SlateProvider, withReact } from "slate-react";
import { SlateChangeEvent, withEvents } from "./events";
import { assert } from "../../util/assert";
import { renderElement } from "./elements";
import { renderLeaf } from "./elements/leaf";
import { noop } from "../../util/noop";
import { RichText } from "./RichText";

interface Props extends PropsWithChildren {
  onChange(value: RichText, options: { operation?: Slate.Operation }): void;
  value: RichText;
}

export const RichTextEditor = forwardRef(({ value, onChange = noop, ...props }: Props, ref) => {
  const [editor] = useState((): Slate.Editor => {
    return withEvents(withReact(withHistory(Slate.createEditor())));
  });

  useImperativeHandle(ref, () => {
    return editor;
  });

  useLayoutEffect(() => {
    if (editor.children !== value) {
      editor.children = value;
      editor.normalize({
        force: true,
      });

      editor.history.undos = [];
      editor.history.redos = [];

      editor.onChange();
    }
  });

  useLayoutEffect(() => {
    const listener = (event: SlateChangeEvent) => {
      assert(Slate.isEditor(event.target?.value));
      onChange(event.target.value.children, {
        operation: event.operation,
      });
    };

    void editor.addEventListener("change", listener);
    return () => editor.removeEventListener("change", listener);
  }, [editor, onChange]);

  return <SlateProvider editor={editor} initialValue={value} {...props} />;
});

RichTextEditor.displayName = "RichTextEditor";
