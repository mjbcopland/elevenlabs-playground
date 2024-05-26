import { ComponentProps, FC, useCallback } from "react";
import * as Slate from "slate";
import { Editable, useSlateStatic } from "slate-react";
import { renderElement } from "./elements";
import { renderLeaf } from "./elements/leaf";

interface Props extends Omit<ComponentProps<typeof Editable>, "renderElement" | "renderLeaf"> {
  _decorate?: (node: Slate.Node, path: Slate.Path, editor: Slate.Editor) => Slate.Range[];
}

export const RichTextArea: FC<Props> = ({ _decorate, ...props }) => {
  const editor = useSlateStatic();

  const decorate = useCallback(
    ([node, path]: Slate.NodeEntry) => {
      return _decorate ? _decorate(node, path, editor) : [];
    },
    [_decorate, editor],
  );

  return (
    <Editable
      role="textbox"
      aria-multiline
      disableDefaultStyles
      style={{ whiteSpace: "pre-wrap" }}
      renderElement={renderElement}
      renderLeaf={renderLeaf}
      decorate={decorate}
      {...props}
    />
  );
};
