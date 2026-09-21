import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
export default function SequentialEdge(props) {
    const [ep] = getSmoothStepPath(props);
    return _jsxs(_Fragment, { children: [_jsx(BaseEdge, { path: ep, style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 }, markerEnd: props.markerEnd }), _jsx("text", { children: _jsx("textPath", { href: `#${props.id}-path`, startOffset: "50%", textAnchor: "middle", style: { fontSize: 9, fill: '#548cf0' }, children: "\u987A\u5E8F" }) })] });
}
