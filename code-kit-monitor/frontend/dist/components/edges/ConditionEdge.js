import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
export default function ConditionEdge(props) {
    const [ep] = getSmoothStepPath(props);
    return _jsxs(_Fragment, { children: [_jsx(BaseEdge, { path: ep, style: { stroke: '#e8a450', strokeWidth: 1.5 }, markerEnd: props.markerEnd }), _jsx("text", { children: _jsx("textPath", { startOffset: "50%", textAnchor: "middle", style: { fontSize: 9, fill: '#e8a450' }, children: props.label || '条件' }) })] });
}
