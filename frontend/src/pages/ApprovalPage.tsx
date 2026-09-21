import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Clock, ShieldCheck, Loader2, MessageSquare } from 'lucide-react';
import { safeFetch, invalidateCache } from '../utils/requestDedup';

interface Approval {
  id: number;
  agent_id: number;
  owner_id: string;
  task_id: string | null;
  status: string;
  form_data: Record<string, any> | null;
  response_data: Record<string, any> | null;
  created_at: string;
  resolved_at: string | null;
}

const uid = () => localStorage.getItem('current_user_id') || 'admin';

export default function ApprovalPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState<'approved' | 'rejected'>('approved');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchApprovals = async () => {
    setLoading(true);
    const result = await safeFetch('/api/approvals?limit=100');
    if (result.ok && result.data) {
      setApprovals(result.data.approvals || []);
    }
    setLoading(false);
  };

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    fetchApprovals();
    intervalRef.current = setInterval(fetchApprovals, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleRespond = async () => {
    if (!selectedApproval) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch(`/api/approvals/${selectedApproval.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
        body: JSON.stringify({
          status: responseStatus,
          response_data: { comment: responseText, timestamp: new Date().toISOString() },
        }),
      });
      if (res.ok) {
        setMessage(responseStatus === 'approved' ? '✅ 已批准' : '❌ 已拒绝');
        setSelectedApproval(null);
        setResponseText('');
        invalidateCache('/api/approvals?limit=100');
        fetchApprovals();
      } else {
        const err = await res.json();
        setMessage(`操作失败: ${err.detail || '未知错误'}`);
      }
    } catch {
      setMessage('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={22} color="var(--color-primary)" />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>人工审批</h1>
          {pendingCount > 0 && (
            <span style={{
              background: 'var(--red)', color: '#fff', borderRadius: 10,
              padding: '2px 8px', fontSize: 12, fontWeight: 700,
            }}>
              {pendingCount} 待处理
            </span>
          )}
        </div>
        <button
          onClick={fetchApprovals}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)',
          }}
        >
          <Loader2 size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          刷新
        </button>
      </div>

      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 6, marginBottom: 16,
          background: message.includes('✅') || message.includes('已批准') ? 'var(--green-bg)' : 'var(--red-bg)',
          color: message.includes('✅') || message.includes('已批准') ? 'var(--green)' : 'var(--red)',
          fontSize: 13,
        }}>
          {message}
        </div>
      )}

      {/* Approval detail modal */}
      {selectedApproval && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setSelectedApproval(null)}
          role="dialog" aria-modal="true"
        >
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-lg)', padding: '24px 28px', maxWidth: 520, width: '90%',
              boxShadow: 'var(--shadow-md)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              审批请求 #{selectedApproval.id}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Agent ID: </span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{selectedApproval.agent_id}</span>
              </div>
              {selectedApproval.task_id && (
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>任务 ID: </span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace' }}>{selectedApproval.task_id}</span>
                </div>
              )}
              {selectedApproval.form_data && Object.keys(selectedApproval.form_data).length > 0 && (
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>请求数据:</span>
                  <pre style={{
                    margin: 0, padding: 8, fontSize: 11, fontFamily: 'monospace',
                    background: 'var(--bg-input)', borderRadius: 4,
                    color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto',
                  }}>
                    {JSON.stringify(selectedApproval.form_data, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>审批决策:</span>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    onClick={() => setResponseStatus('approved')}
                    style={{
                      padding: '6px 16px', borderRadius: 4, border: '2px solid',
                      borderColor: responseStatus === 'approved' ? 'var(--green)' : 'var(--border)',
                      background: responseStatus === 'approved' ? 'var(--green-bg)' : 'none',
                      color: responseStatus === 'approved' ? 'var(--green)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 13, fontWeight: responseStatus === 'approved' ? 600 : 400,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <CheckCircle size={14} /> 批准
                  </button>
                  <button
                    onClick={() => setResponseStatus('rejected')}
                    style={{
                      padding: '6px 16px', borderRadius: 4, border: '2px solid',
                      borderColor: responseStatus === 'rejected' ? 'var(--red)' : 'var(--border)',
                      background: responseStatus === 'rejected' ? 'var(--red-bg)' : 'none',
                      color: responseStatus === 'rejected' ? 'var(--red)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 13, fontWeight: responseStatus === 'rejected' ? 600 : 400,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <XCircle size={14} /> 拒绝
                  </button>
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>备注:</span>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="输入审批意见..."
                  rows={3}
                  style={{
                    width: '100%', padding: '7px 10px',
                    borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                    background: 'var(--bg-input)', color: 'var(--text-primary)',
                    fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn" onClick={() => setSelectedApproval(null)}>取消</button>
              <button
                className="btn btn-primary"
                onClick={handleRespond}
                disabled={submitting}
                style={{ opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? '提交中...' : '确认提交'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
          <p>加载中...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
          <ShieldCheck size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>暂无审批请求</p>
          <p style={{ fontSize: 12 }}>当 Agent 执行需要人工确认时，审批请求会出现在这里</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {approvals.map((a) => (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', background: 'var(--color-surface)',
                border: '1px solid var(--color-border)', borderRadius: 8,
                cursor: a.status === 'pending' ? 'pointer' : 'default',
                opacity: a.status !== 'pending' ? 0.7 : 1,
              }}
              onClick={() => { if (a.status === 'pending') setSelectedApproval(a); }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: a.status === 'pending' ? 'var(--orange-bg, #f59e0b20)' : a.status === 'approved' ? 'var(--green-bg)' : 'var(--red-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: a.status === 'pending' ? '#f59e0b' : a.status === 'approved' ? 'var(--green)' : 'var(--red)',
                flexShrink: 0,
              }}>
                {a.status === 'pending' ? <Clock size={18} /> : a.status === 'approved' ? <CheckCircle size={18} /> : <XCircle size={18} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>审批 #{a.id}</span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 3,
                    background: a.status === 'pending' ? 'var(--orange-bg, #f59e0b20)' : a.status === 'approved' ? 'var(--green-bg)' : 'var(--red-bg)',
                    color: a.status === 'pending' ? '#f59e0b' : a.status === 'approved' ? 'var(--green)' : 'var(--red)',
                    fontWeight: 500,
                  }}>
                    {a.status === 'pending' ? '待审批' : a.status === 'approved' ? '已批准' : '已拒绝'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  Agent #{a.agent_id}{a.task_id ? ` · 任务: ${a.task_id}` : ''}
                </div>
                {a.form_data && Object.keys(a.form_data).length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <MessageSquare size={10} style={{ marginRight: 4 }} />
                    {JSON.stringify(a.form_data).slice(0, 80)}{JSON.stringify(a.form_data).length > 80 ? '...' : ''}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(a.created_at).toLocaleString('zh-CN')}
                  {a.resolved_at && ` · 处理于 ${new Date(a.resolved_at).toLocaleString('zh-CN')}`}
                </div>
              </div>

              {a.status === 'pending' && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedApproval(a); }}
                  style={{
                    padding: '5px 14px', background: 'var(--color-primary)', color: '#fff',
                    border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  处理
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
