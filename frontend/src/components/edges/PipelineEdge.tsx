import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
export default function PipelineEdge(props: EdgeProps) {
  const [ep] = getSmoothStepPath(props);
  return <><BaseEdge path={ep} style={{ stroke: '#6a9df4', strokeWidth: 2 }} markerEnd={props.markerEnd} /><text><textPath startOffset="50%" textAnchor="middle" style={{ fontSize: 9, fill: '#6a9df4' }}>流水线</textPath></text></>;
}
