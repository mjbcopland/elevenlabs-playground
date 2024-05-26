import { CSSProperties } from "react";
import { RenderLeafProps } from "slate-react";

export const renderLeaf = (props: RenderLeafProps): JSX.Element => {
  const highlight = props.leaf.style?.highlight ?? false;

  const style: CSSProperties = {
    color: highlight ? "blue" : undefined,
    // fontWeight: highlight ? "bold" : undefined,
    textDecoration: highlight ? "underline" : undefined,
  };

  return (
    <span style={style} {...props.attributes}>
      {props.children}
    </span>
  );
};
