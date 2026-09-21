import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
export default function FanOutEdge(props: EdgeProps) {
  const [ep] = getSmoothStepPath(props);
  return <><BaseEdge path={ep} style={{ stroke: '#548cf0', strokeWidth: 1.5 }} markerEnd={props.markerEnd} /><text><textPath startOffset="50%" textAnchor="middle" style={{ fontSize: 9, fill: '#548cf0' }}>扇出</textPath></text></>;
}
