import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
export default function DeadLetterEdge(props) {
    const [ep] = getSmoothStepPath(props);
    return _jsxs(_Fragment, { children: [_jsx(BaseEdge, { path: ep, style: { stroke: '#5d6068', strokeWidth: 1, strokeDasharray: '3 5' }, markerEnd: props.markerEnd }), _jsx("text", { children: _jsx("textPath", { startOffset: "50%", textAnchor: "middle", style: { fontSize: 9, fill: '#5d6068' }, children: "\u6B7B\u4FE1" }) })] });
}
