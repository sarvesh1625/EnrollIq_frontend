import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

/* Online payments — the school enters its OWN gateway keys here.
   Parents will only see the gateways that are saved AND switched on. */

const NOTE = {
  razorpay: 'Most popular · cards, UPI, net banking, wallets',
  cashfree: 'Cards, UPI, net banking, wallets',
  phonepe:  'UPI and cards through PhonePe',
}
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
const when = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

function Badge({ children, tone = 'gray' }) {
  const t = { gray: ['#f3f4f6', '#6b7280'], green: ['var(--c-green-lt, #dcfce7)', 'var(--c-green, #15803d)'], amber: ['#fef3c7', '#92400e'], red: ['var(--c-red-lt, #fee2e2)', 'var(--c-red, #dc2626)'], blue: ['#eef2ff', '#4f46e5'] }[tone]
  return <span style={{ background: t[0], color: t[1], fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99 }}>{children}</span>
}

function GatewayCard({ g, rank, onChanged }) {
  const [vals, setVals] = useState({})
  const [mode, setMode] = useState(g.mode || 'test')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)             // { ok, text }
  const [open, setOpen] = useState(!g.saved)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setMode(g.mode || 'test') }, [g.mode])
  const set = (k, v) => setVals((s) => ({ ...s, [k]: v }))
  const run = async (key, fn) => { setBusy(key); setMsg(null); try { await fn() } catch (e) { setMsg({ ok: false, text: e.response?.data?.message || 'Something went wrong' }) } finally { setBusy('') } }

  const save = () => run('save', async () => {
    const credentials = {}
    g.fields.forEach((f) => { if ((vals[f.key] ?? '').trim()) credentials[f.key] = vals[f.key].trim() })
    const r = await api.put(`/payments/gateways/${g.provider}`, { credentials, mode, enabled: true })
    setVals({}); setMsg({ ok: true, text: r.data.message }); await onChanged(); setOpen(false)
  })
  const test = () => run('test', async () => {
    const r = await api.post(`/payments/gateways/${g.provider}/test`)
    setMsg({ ok: r.data.ok, text: r.data.message })
  })
  const toggle = () => run('toggle', async () => {
    const r = await api.patch(`/payments/gateways/${g.provider}/enabled`, { enabled: !g.enabled })
    setMsg({ ok: true, text: r.data.message }); await onChanged()
  })
  const remove = () => {
    if (!window.confirm(`Remove the saved ${g.label} keys? Parents will no longer be able to pay with ${g.label}.`)) return
    run('remove', async () => { await api.delete(`/payments/gateways/${g.provider}`); setMsg(null); await onChanged(); setOpen(true) })
  }
  const copy = async () => { try { await navigator.clipboard.writeText(g.webhook_url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ } }

  const status = !g.saved ? <Badge>Not set up</Badge>
    : !g.configured ? <Badge tone="red">Keys incomplete</Badge>
    : g.enabled ? <Badge tone="green">Showing to parents</Badge> : <Badge tone="amber">Switched off</Badge>

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--c-brand-lt, #eef2ff)', color: 'var(--c-brand, #5d5cf5)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{rank}</div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="text-sm font-semibold text-ink" style={{ fontSize: 16 }}>{g.label}</span>
            {status}
            {g.saved && <Badge tone={g.mode === 'live' ? 'blue' : 'gray'}>{g.mode === 'live' ? 'Live money' : 'Test mode'}</Badge>}
          </div>
          <p style={{ fontSize: 12, color: 'var(--c-muted, #6b7280)', margin: '2px 0 0' }}>{NOTE[g.provider]}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {g.saved && g.configured && <button className="btn-ghost" onClick={toggle} disabled={!!busy}>{g.enabled ? 'Switch off' : 'Switch on'}</button>}
          <button className="btn-ghost" onClick={() => setOpen(!open)}>{open ? 'Close' : g.saved ? 'Edit keys' : 'Set up'}</button>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--c-border, #e5e7eb)', paddingTop: 16 }}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {g.fields.map((f) => (
              <div key={f.key}>
                <label className="label" htmlFor={`${g.provider}-${f.key}`}>{f.label}{f.required ? ' *' : ''}</label>
                <input id={`${g.provider}-${f.key}`} className="input" type={f.secret ? 'password' : 'text'} autoComplete="off"
                  placeholder={f.has_value ? (f.secret ? f.value + '  (leave blank to keep)' : f.value) : (f.default || '')}
                  value={vals[f.key] ?? (f.secret ? '' : f.has_value ? f.value : '')} onChange={(e) => set(f.key, e.target.value)} />
                {f.help && <p style={{ fontSize: 11, color: 'var(--c-muted, #6b7280)', margin: '4px 0 0' }}>{f.help}</p>}
              </div>
            ))}
            {g.provider !== 'razorpay' && (
              <div>
                <label className="label" htmlFor={`${g.provider}-mode`}>Mode</label>
                <select id={`${g.provider}-mode`} className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="test">Test (no real money)</option>
                  <option value="live">Live (real money)</option>
                </select>
              </div>
            )}
          </div>
          {g.provider === 'razorpay' && <p style={{ fontSize: 11, color: 'var(--c-muted, #6b7280)', marginTop: 8 }}>Test or live is picked automatically from the Key ID (rzp_test_… or rzp_live_…).</p>}

          <div style={{ marginTop: 14, background: 'var(--c-surface-2, #f9fafb)', border: '1px solid var(--c-border, #e5e7eb)', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>Webhook URL (paste this in the {g.label} dashboard)</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <code style={{ fontSize: 12, wordBreak: 'break-all', flex: 1 }}>{g.webhook_url}</code>
              <button className="btn-ghost" style={{ fontSize: 12 }} onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--c-muted, #6b7280)', margin: '6px 0 0' }}>
              Optional but recommended: it confirms a payment even if the parent closes the page right after paying.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={save} disabled={!!busy}>{busy === 'save' ? 'Saving…' : 'Save keys'}</button>
            {g.saved && <button className="btn-ghost" onClick={test} disabled={!!busy}>{busy === 'test' ? 'Testing…' : 'Test connection'}</button>}
            {g.saved && <button className="btn-ghost" style={{ color: 'var(--c-red, #dc2626)' }} onClick={remove} disabled={!!busy}>Remove</button>}
          </div>
        </div>
      )}
      {msg && (
        <div role="status" style={{ marginTop: 12, fontSize: 13, padding: '10px 14px', borderRadius: 8,
          background: msg.ok ? 'var(--c-green-lt, #dcfce7)' : 'var(--c-red-lt, #fee2e2)', color: msg.ok ? 'var(--c-green, #15803d)' : 'var(--c-red, #dc2626)' }}>{msg.text}</div>
      )}
    </div>
  )
}

export default function PaymentSettings() {
  const [gateways, setGateways] = useState(null)
  const [tx, setTx] = useState([])
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const [g, t] = await Promise.all([api.get('/payments/gateways'), api.get('/payments/transactions')])
      setGateways(g.data); setTx(t.data); setErr('')
    } catch (e) { setErr(e.response?.data?.message || 'Could not load payment settings.') }
  }, [])
  useEffect(() => { load() }, [load])

  const live = (gateways || []).filter((g) => g.shown_to_parents)
  return (
    <Layout>
      <div className="page page-narrow">
        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">Online payments</h1>
            <p style={{ color: 'var(--c-muted, #6b7280)', fontSize: 13, margin: '6px 0 0' }}>
              Parents pay school fees online. Money goes straight into your own gateway account. Add the keys of any gateway you use — parents will only see the ones that are set up and switched on.
            </p>
          </div>
        </div>

        {err && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4" role="alert">{err}</div>}
        {!gateways && !err && <p style={{ fontSize: 13, color: 'var(--c-muted, #6b7280)' }}>Loading…</p>}

        {gateways && (
          <>
            <div style={{ fontSize: 13, margin: '0 0 14px', color: 'var(--c-muted, #6b7280)' }}>
              {live.length
                ? <>Parents currently see: <b style={{ color: 'inherit' }}>{live.map((g) => g.label).join(', ')}</b></>
                : 'No gateway is switched on yet, so parents cannot pay online.'}
            </div>
            {gateways.map((g, i) => <GatewayCard key={g.provider} g={g} rank={i + 1} onChanged={load} />)}

            <div className="card">
              <p className="text-sm font-semibold text-ink" style={{ marginBottom: 10 }}>Recent online payments</p>
              {tx.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--c-muted, #6b7280)' }}>No online payments yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead><tr style={{ textAlign: 'left', color: 'var(--c-muted, #6b7280)', fontSize: 12 }}>
                      <th style={{ padding: '6px 8px' }}>Student</th><th style={{ padding: '6px 8px' }}>Via</th>
                      <th style={{ padding: '6px 8px' }}>Amount</th><th style={{ padding: '6px 8px' }}>Status</th><th style={{ padding: '6px 8px' }}>When</th>
                    </tr></thead>
                    <tbody>{tx.map((t) => (
                      <tr key={t.id} style={{ borderTop: '1px solid var(--c-border, #e5e7eb)' }}>
                        <td style={{ padding: '8px' }}>{t.student_name || '—'} <span style={{ color: 'var(--c-muted, #6b7280)', fontSize: 11 }}>{t.student_class}</span></td>
                        <td style={{ padding: '8px', textTransform: 'capitalize' }}>{t.provider}</td>
                        <td style={{ padding: '8px' }}>{inr(t.amount)}</td>
                        <td style={{ padding: '8px' }}><Badge tone={t.status === 'paid' ? 'green' : t.status === 'failed' ? 'red' : 'amber'}>{t.status === 'created' ? 'Not completed' : t.status}</Badge>
                          {t.error && <div style={{ fontSize: 11, color: 'var(--c-red, #dc2626)' }}>{t.error}</div>}</td>
                        <td style={{ padding: '8px', color: 'var(--c-muted, #6b7280)' }}>{when(t.paid_at || t.created_at)}</td>
                      </tr>))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}