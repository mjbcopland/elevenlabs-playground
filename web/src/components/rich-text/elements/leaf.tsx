import { RenderLeafProps } from "slate-react";
import { cn } from "../../../util/react";

export const renderLeaf = (props: RenderLeafProps): JSX.Element => {
  const highlight = props.leaf.highlight ?? false;
  const muted = props.leaf.muted ?? false;

  const className = cn({
    "bg-gray-200": highlight,
    "text-muted-foreground": muted,
  });

  return (
    <span className={className} {...props.attributes}>
      {props.children}
    </span>
  );
};
