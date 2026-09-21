import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
export default function MasterSlaveEdge(props: EdgeProps) {
  const [ep] = getSmoothStepPath(props);
  return <><BaseEdge path={ep} style={{ stroke: '#9699a0', strokeWidth: 2.5 }} markerEnd={props.markerEnd} /><text><textPath startOffset="50%" textAnchor="middle" style={{ fontSize: 9, fill: '#9699a0' }}>主从</textPath></text></>;
}
