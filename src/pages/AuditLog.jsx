import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

/* EnrollIQ — Audit log (who changed what, when). Admin / chairman / principal only. */

const VERB = { POST: 'Added / ran', PUT: 'Changed', PATCH: 'Changed', DELETE: 'Deleted' }
const VERB_STYLE = {
  POST:   { bg: 'var(--c-blue-lt)',  c: 'var(--c-blue)' },
  PUT:    { bg: 'var(--c-amber-lt)', c: 'var(--c-amber)' },
  PATCH:  { bg: 'var(--c-amber-lt)', c: 'var(--c-amber)' },
  DELETE: { bg: 'var(--c-red-lt)',   c: 'var(--c-red)' },
}
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AuditLog() {
  const [data, setData]   = useState({ rows: [], total: 0, pages: 1, entities: [], users: [] })
  const [f, setF]         = useState({ entity: '', user: '', method: '', from: '', to: '', q: '' })
  const [page, setPage]   = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen]   = useState(null)
  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setPage(1) }

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = { page }; Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v })
      const r = await api.get('/audit', { params }); setData(r.data)
    } catch (e) { setError(e.response?.data?.message || 'Could not load the audit log') }
    finally { setLoading(false) }
  }, [f, page])
  useEffect(() => { const t = setTimeout(load, f.q ? 400 : 0); return () => clearTimeout(t) }, [load]) // eslint-disable-line

  return (
    <Layout>
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">Audit log</h1>
            <p className="text-gray-400 text-sm mt-1">Every change made in the system — who did it and when. {data.total ? `${data.total} entries` : ''}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Search name, page or details…" value={f.q} onChange={set('q')} />
          <select className="input" style={{ width: 150 }} value={f.entity} onChange={set('entity')}>
            <option value="">All areas</option>{data.entities.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select className="input" style={{ width: 160 }} value={f.user} onChange={set('user')}>
            <option value="">All people</option>{data.users.map((u) => <option key={u.user_id} value={u.user_id}>{u.user_name}</option>)}
          </select>
          <select className="input" style={{ width: 130 }} value={f.method} onChange={set('method')}>
            <option value="">All actions</option><option value="POST">Added</option><option value="PUT">Changed</option><option value="DELETE">Deleted</option>
          </select>
          <input className="input" type="date" style={{ width: 150 }} value={f.from} onChange={set('from')} title="From" />
          <input className="input" type="date" style={{ width: 150 }} value={f.to} onChange={set('to')} title="To" />
        </div>

        {error && <div className="card" style={{ color: 'var(--c-red)', fontSize: 13 }}>{error}</div>}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? <div style={{ textAlign: 'center', padding: 48, color: 'var(--c-muted)' }}>Loading…</div>
          : data.rows.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🧾</div><p className="empty-title">No entries</p><p className="empty-sub">Changes made from now on will appear here.</p></div>
          ) : data.rows.map((r, i) => {
            const st = VERB_STYLE[r.method] || VERB_STYLE.POST
            return (
              <div key={r.id} onClick={() => setOpen(open === r.id ? null : r.id)} style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: i < data.rows.length - 1 ? '1px solid #faf9f7' : 'none' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: st.bg, color: st.c, minWidth: 74, textAlign: 'center' }}>{VERB[r.method] || r.method}</span>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{r.user_name || 'Unknown'} <span style={{ fontWeight: 400, color: 'var(--c-muted)' }}>· {r.role}</span></p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--c-muted)', fontFamily: 'monospace' }}>{r.path}{r.entity_id ? `  (#${r.entity_id})` : ''}</p>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>{when(r.created_at)}</span>
                </div>
                {open === r.id && (
                  <pre style={{ margin: '10px 0 0', padding: 10, background: 'var(--c-surface-2)', borderRadius: 8, fontSize: 11.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {(() => { try { return JSON.stringify(JSON.parse(r.details || '{}'), null, 2) } catch { return r.details } })()}{'\n'}IP {r.ip || '—'} · status {r.status}
                  </pre>
                )}
              </div>
            )
          })}
        </div>

        {data.pages > 1 && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', marginTop: 16 }}>
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Newer</button>
            <span className="text-xs text-gray-400">Page {page} of {data.pages}</span>
            <button className="btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Older →</button>
          </div>
        )}
      </div>
    </Layout>
  )
}