import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
export default function HumanApprovalEdge(props: EdgeProps) {
  const [ep] = getSmoothStepPath(props);
  return <><BaseEdge path={ep} style={{ stroke: '#e8a450', strokeWidth: 2, strokeDasharray: '8 4' }} markerEnd={props.markerEnd} /><text><textPath startOffset="50%" textAnchor="middle" style={{ fontSize: 9, fill: '#e8a450' }}>人工确认</textPath></text></>;
}
