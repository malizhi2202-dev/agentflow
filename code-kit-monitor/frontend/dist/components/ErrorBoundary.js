import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
export default class ErrorBoundary extends Component {
    constructor() {
        super(...arguments);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error) { return { error }; }
    render() {
        if (this.state.error) {
            return (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40 }, children: _jsxs("div", { style: { textAlign: 'center', maxWidth: 400 }, children: [_jsx(AlertTriangle, { size: 32, style: { color: 'var(--red)', marginBottom: 12 } }), _jsx("h2", { style: { fontSize: 16, fontWeight: 700, marginBottom: 8 }, children: "\u9875\u9762\u6E32\u67D3\u51FA\u9519" }), _jsx("p", { style: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-mono)', wordBreak: 'break-all', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 'var(--r-sm)', maxHeight: 120, overflow: 'auto' }, children: this.state.error.message }), _jsxs("button", { className: "btn btn-primary btn-sm", onClick: () => this.setState({ error: null }), children: [_jsx(RefreshCw, { size: 12 }), " \u91CD\u8BD5"] })] }) }));
        }
        return this.props.children;
    }
}
