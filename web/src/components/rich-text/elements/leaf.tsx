import { RenderLeafProps } from "slate-react";

export const renderLeaf = (props: RenderLeafProps): JSX.Element => {
  return <span {...props.attributes}>{props.children}</span>;
};
