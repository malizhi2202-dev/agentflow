import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
export default function EventTriggerEdge(props: EdgeProps) {
  const [ep] = getSmoothStepPath(props);
  return <><BaseEdge path={ep} style={{ stroke: '#5d6068', strokeWidth: 1.5, strokeDasharray: '6 4' }} markerEnd={props.markerEnd} /><text><textPath startOffset="50%" textAnchor="middle" style={{ fontSize: 9, fill: '#5d6068' }}>事件</textPath></text></>;
}
