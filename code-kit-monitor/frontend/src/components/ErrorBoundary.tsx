import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40 }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <AlertTriangle size={32} style={{ color: 'var(--red)', marginBottom: 12 }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>页面渲染出错</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-mono)', wordBreak: 'break-all', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 'var(--r-sm)', maxHeight: 120, overflow: 'auto' }}>
              {this.state.error.message}
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => this.setState({ error: null })}>
              <RefreshCw size={12} /> 重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
