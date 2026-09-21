import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
export default function MapReduceEdge(props) {
    const [ep] = getSmoothStepPath(props);
    return _jsxs(_Fragment, { children: [_jsx(BaseEdge, { path: ep, style: { stroke: '#b47cd8', strokeWidth: 1.5 }, markerEnd: props.markerEnd }), _jsx("text", { children: _jsx("textPath", { startOffset: "50%", textAnchor: "middle", style: { fontSize: 9, fill: '#b47cd8' }, children: "\u6620\u5C04\u5F52\u7EA6" }) })] });
}
