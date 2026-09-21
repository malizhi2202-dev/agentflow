import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
export default function MapReduceEdge(props: EdgeProps) {
  const [ep] = getSmoothStepPath(props);
  return <><BaseEdge path={ep} style={{ stroke: '#b47cd8', strokeWidth: 1.5 }} markerEnd={props.markerEnd} /><text><textPath startOffset="50%" textAnchor="middle" style={{ fontSize: 9, fill: '#b47cd8' }}>映射归约</textPath></text></>;
}
