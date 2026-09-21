import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
export default function ParallelEdge(props: EdgeProps) {
  const [ep] = getSmoothStepPath(props);
  return <><BaseEdge path={ep} style={{ stroke: '#5cb878', strokeWidth: 1 }} markerEnd={props.markerEnd} /><text><textPath startOffset="50%" textAnchor="middle" style={{ fontSize: 9, fill: '#5cb878' }}>并发</textPath></text></>;
}
