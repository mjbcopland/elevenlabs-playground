import { useState, useLayoutEffect, ComponentProps, PropsWithChildren, FC, Component } from "react";
import { Editable, Slate as SlateProvider, withReact } from "slate-react";
import { renderElement } from "./elements";
import { renderLeaf } from "./elements/leaf";

interface Props extends Omit<ComponentProps<typeof Editable>, "renderElement" | "renderLeaf"> {}

export const RichTextArea: FC<Props> = (props) => {
  return <Editable role="textbox" aria-multiline renderElement={renderElement} renderLeaf={renderLeaf} {...props} />;
};
