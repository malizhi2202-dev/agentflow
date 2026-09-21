import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
export default function ForkEdge(props: EdgeProps) {
  const [ep] = getSmoothStepPath(props);
  return <><BaseEdge path={ep} style={{ stroke: '#e8a450', strokeWidth: 1.5 }} markerEnd={props.markerEnd} /><text><textPath startOffset="50%" textAnchor="middle" style={{ fontSize: 9, fill: '#e8a450' }}>分叉</textPath></text></>;
}
