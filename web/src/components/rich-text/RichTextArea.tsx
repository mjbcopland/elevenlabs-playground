import { ComponentProps, FC, useMemo } from "react";
import * as Slate from "slate";
import { Editable, useSlateStatic } from "slate-react";
import { renderElement } from "./elements";
import { renderLeaf } from "./elements/leaf";

interface Props extends Omit<ComponentProps<typeof Editable>, "decorate" | "renderElement" | "renderLeaf"> {
  decorate?: (node: Slate.Node, path: Slate.Path, editor: Slate.Editor) => Slate.Range[];
}

export const RichTextArea: FC<Props> = ({ decorate, ...props }) => {
  const editor = useSlateStatic();

  // wrap the incoming decorate function in a scope with the current editor
  const _decorate = useMemo((): ((entry: Slate.NodeEntry) => Slate.Range[]) | undefined => {
    return decorate ? ([node, path]) => decorate(node, path, editor) : undefined;
  }, [decorate, editor]);

  return (
    <Editable
      role="textbox"
      aria-multiline
      disableDefaultStyles
      style={{ whiteSpace: "pre-wrap" }}
      renderElement={renderElement}
      renderLeaf={renderLeaf}
      decorate={_decorate}
      {...props}
    />
  );
};
