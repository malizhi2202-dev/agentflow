import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
export default function RetryFallbackEdge(props: EdgeProps) {
  const [ep] = getSmoothStepPath(props);
  return <><BaseEdge path={ep} style={{ stroke: '#e05555', strokeWidth: 1.5, strokeDasharray: '4 3' }} markerEnd={props.markerEnd} /><text><textPath startOffset="50%" textAnchor="middle" style={{ fontSize: 9, fill: '#e05555' }}>重试</textPath></text></>;
}
