import { useState, useLayoutEffect, ComponentProps, PropsWithChildren, FC } from "react";
import * as Slate from "slate";
import { withHistory } from "slate-history";
import { Editable, Slate as SlateProvider, withReact } from "slate-react";
import { SlateChangeEvent, withEvents } from "./events";
import { assert } from "../../util/assert";
import { renderElement } from "./elements";
import { renderLeaf } from "./elements/leaf";
import { noop } from "../../util/noop";

interface Props extends PropsWithChildren {
  onChange(value: RichText, options: { operation?: Slate.Operation }): void;
  value: RichText;
}

export type RichText = Slate.Descendant[];

export const RichTextEditor: FC<Props> = ({ value, onChange = noop, ...props }) => {
  const [editor] = useState((): Slate.Editor => {
    return withEvents(withReact(withHistory(Slate.createEditor())));
  });

  useLayoutEffect(() => {
    if (editor.children !== value) {
      editor.children = value;
      editor.normalize({
        force: true,
      });
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
  });

  return <SlateProvider editor={editor} initialValue={value} {...props} />;
};

export const RichTextArea = (props) => {
  return <Editable role="textbox" aria-multiline renderElement={renderElement} renderLeaf={renderLeaf} {...props} />;
};
