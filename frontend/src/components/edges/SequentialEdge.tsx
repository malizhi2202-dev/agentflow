import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
export default function SequentialEdge(props: EdgeProps) {
  const [ep] = getSmoothStepPath(props);
  return <><BaseEdge path={ep} style={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 }} markerEnd={props.markerEnd} /><text><textPath href={`#${props.id}-path`} startOffset="50%" textAnchor="middle" style={{ fontSize: 9, fill: '#548cf0' }}>顺序</textPath></text></>;
}
