/** 自定义 Edge 组件注册表 — 13 种连线类型. */
import SequentialEdge from './SequentialEdge';
import PipelineEdge from './PipelineEdge';
import ParallelEdge from './ParallelEdge';
import FanOutEdge from './FanOutEdge';
import FanInEdge from './FanInEdge';
import MapReduceEdge from './MapReduceEdge';
import ForkEdge from './ForkEdge';
import ConditionEdge from './ConditionEdge';
import MasterSlaveEdge from './MasterSlaveEdge';
import EventTriggerEdge from './EventTriggerEdge';
import HumanApprovalEdge from './HumanApprovalEdge';
import RetryFallbackEdge from './RetryFallbackEdge';
import DeadLetterEdge from './DeadLetterEdge';
import type { EdgeTypes } from '@xyflow/react';

export const customEdgeTypes: EdgeTypes = {
  sequential: SequentialEdge,
  pipeline: PipelineEdge,
  parallel: ParallelEdge,
  'fan-out': FanOutEdge,
  'fan-in': FanInEdge,
  'map-reduce': MapReduceEdge,
  fork: ForkEdge,
  condition: ConditionEdge,
  'master-slave': MasterSlaveEdge,
  'event-trigger': EventTriggerEdge,
  'human-approval': HumanApprovalEdge,
  'retry-fallback': RetryFallbackEdge,
  'dead-letter': DeadLetterEdge,
};
