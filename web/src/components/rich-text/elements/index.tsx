import { RenderElementProps } from "slate-react";

export const renderElement = (props: RenderElementProps): JSX.Element => {
  if (props.element.type === "paragraph") return <p {...props.attributes}>{props.children}</p>;

  throw new TypeError(props.element.type);
};
