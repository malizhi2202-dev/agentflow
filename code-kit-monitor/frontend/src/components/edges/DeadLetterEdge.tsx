import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
export default function DeadLetterEdge(props: EdgeProps) {
  const [ep] = getSmoothStepPath(props);
  return <><BaseEdge path={ep} style={{ stroke: '#5d6068', strokeWidth: 1, strokeDasharray: '3 5' }} markerEnd={props.markerEnd} /><text><textPath startOffset="50%" textAnchor="middle" style={{ fontSize: 9, fill: '#5d6068' }}>死信</textPath></text></>;
}
