import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../api/axios'

/* ═══════════════════════════════════════════════════════════════
   EnrollIQ — public fee payment page   (route: /pay/:token — NO login)
   Parents open the link the school sends them, pick a method, pay.
   ═══════════════════════════════════════════════════════════════ */

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

function loadScript(src, test) {
  return new Promise((resolve, reject) => {
    if (test()) return resolve()
    const s = document.createElement('script')
    s.src = src; s.async = true
    s.onload = resolve; s.onerror = () => reject(new Error('Could not load the payment window. Check your internet and try again.'))
    document.body.appendChild(s)
  })
}

const C = { ink: '#18150f', mute: '#6b6b6b', line: '#e7e2d8', brand: '#0f766e', bg: '#f6f4ee', ok: '#059669', bad: '#dc2626', warn: '#b45309' }

export default function PayPage() {
  const { token } = useParams()
  const [sp] = useSearchParams()
  const returned = sp.get('attempt')
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [checking, setChecking] = useState(!!returned)

  const load = useCallback(async () => {
    try { const r = await api.get(`/payments/public/${token}`); setData(r.data); setErr('') }
    catch (e) { setErr(e.response?.data?.message || 'This payment link is not valid.') }
  }, [token])

  const check = useCallback(async () => {
    setChecking(true)
    try {
      for (let i = 0; i < 6; i++) {                       // the gateway can take a few seconds to confirm
        const r = await api.get(`/payments/public/${token}/status`)
        if (r.data.status === 'paid') break
        if (r.data.status === 'failed') { setMsg('The payment did not go through. You have not been charged — please try again.'); break }
        await new Promise((res) => setTimeout(res, 2500))
      }
    } catch {}
    await load(); setChecking(false)
  }, [token, load])

  useEffect(() => { returned ? check().then(() => {}) : load() }, []) // eslint-disable-line

  const pay = async (provider) => {
    setBusy(provider); setMsg('')
    try {
      const { data: s } = await api.post(`/payments/public/${token}/start`, { provider })
      if (s.type === 'razorpay') {
        await loadScript('https://checkout.razorpay.com/v1/checkout.js', () => window.Razorpay)
        const rz = new window.Razorpay({
          key: s.key_id, order_id: s.order_id, amount: s.amount_paise, currency: s.currency || 'INR',
          name: data.school.name || 'School fees', description: data.student.name,
          theme: { color: C.brand },
          handler: async (resp) => {
            setChecking(true)
            try { await api.post(`/payments/public/${token}/razorpay/verify`, resp) } catch (e) { setMsg(e.response?.data?.message || 'We could not confirm the payment yet. Tap "Check again".') }
            await load(); setChecking(false)
          },
          modal: { ondismiss: () => setBusy('') },
        })
        rz.on('payment.failed', (r) => setMsg(r?.error?.description || 'Payment failed. You have not been charged.'))
        rz.open()
      } else if (s.type === 'cashfree') {
        await loadScript('https://sdk.cashfree.com/js/v3/cashfree.js', () => window.Cashfree)
        const cf = window.Cashfree({ mode: s.mode })
        cf.checkout({ paymentSessionId: s.payment_session_id, redirectTarget: '_self' })
      } else if (s.type === 'phonepe') {
        window.location.href = s.redirect_url
      } else setMsg('This payment method is not available right now.')
    } catch (e) {
      setMsg(e.response?.data?.message || e.message || 'Could not start the payment.')
    } finally { setBusy('') }
  }

  const Shell = ({ children }) => (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', justifyContent: 'center', padding: '24px 16px', fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", color: C.ink }}>
      <div style={{ width: '100%', maxWidth: 440 }}>{children}
        <p style={{ textAlign: 'center', fontSize: 11, color: C.mute, marginTop: 18 }}>🔒 Secure payment · Powered by EnrollIQ</p>
      </div>
    </div>
  )
  const Card = ({ children }) => <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 18px rgba(0,0,0,.05)' }}>{children}</div>

  if (err) return <Shell><Card><p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Link not available</p><p style={{ color: C.mute, fontSize: 14 }}>{err}</p><p style={{ color: C.mute, fontSize: 13 }}>Please contact the school office for a new payment link.</p></Card></Shell>
  if (!data) return <Shell><Card><p style={{ color: C.mute, textAlign: 'center', margin: 0 }}>Loading…</p></Card></Shell>

  const head = (
    <div style={{ textAlign: 'center', marginBottom: 14 }}>
      {data.school.logo && <img src={data.school.logo} alt="" style={{ height: 52, objectFit: 'contain', marginBottom: 6 }} />}
      <p style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 700, margin: 0 }}>{data.school.name}</p>
      <p style={{ color: C.mute, fontSize: 13, margin: '4px 0 0' }}>Fee payment</p>
    </div>
  )

  if (checking) return <Shell>{head}<Card><p style={{ textAlign: 'center', margin: 0, fontWeight: 600 }}>Confirming your payment…</p><p style={{ textAlign: 'center', color: C.mute, fontSize: 13 }}>Please don't close this page.</p></Card></Shell>

  if (data.status === 'paid') return (
    <Shell>{head}<Card>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ecfdf5', color: C.ok, fontSize: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
        <p style={{ fontSize: 20, fontWeight: 700, margin: '10px 0 2px' }}>Payment received</p>
        <p style={{ color: C.mute, fontSize: 14, margin: 0 }}>Thank you! The school has been notified for {data.student.name}.</p>
        <p style={{ color: C.mute, fontSize: 12, marginTop: 14 }}>You can close this page.</p>
      </div>
    </Card></Shell>
  )

  if (data.status === 'expired' || data.status === 'cancelled') return (
    <Shell>{head}<Card><p style={{ fontWeight: 700, fontSize: 17, margin: 0 }}>This link has expired</p><p style={{ color: C.mute, fontSize: 14 }}>Please ask the school office to send you a new payment link.</p></Card></Shell>
  )

  return (
    <Shell>{head}<Card>
      <div style={{ paddingBottom: 12, borderBottom: `1px solid ${C.line}` }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{data.student.name}</p>
        <p style={{ margin: '2px 0 0', color: C.mute, fontSize: 13 }}>{data.student.class}{data.student.section ? ` - ${data.student.section}` : ''}</p>
      </div>
      <div style={{ padding: '10px 0' }}>
        {data.items.map((i) => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', fontSize: 14 }}>
            <div><div style={{ fontWeight: 600 }}>{i.fee_type}</div>{i.due_date && <div style={{ fontSize: 12, color: C.mute }}>Due {fmtDate(i.due_date)}</div>}</div>
            <div style={{ fontWeight: 600 }}>{inr(i.due)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: `1px solid ${C.line}`, fontSize: 18, fontWeight: 800 }}>
        <span>Total to pay</span><span>{inr(data.amount)}</span>
      </div>

      {msg && <div style={{ background: '#fef2f2', color: C.bad, fontSize: 13, padding: '9px 12px', borderRadius: 10, marginBottom: 10 }}>{msg}</div>}

      {data.gateways.length === 0 ? (
        <p style={{ color: C.warn, fontSize: 13, background: '#fffbeb', padding: '10px 12px', borderRadius: 10, margin: 0 }}>Online payment is not switched on for this school yet. Please pay at the school office.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.gateways.map((g) => (
            <button key={g.provider} onClick={() => pay(g.provider)} disabled={!!busy}
              style={{ background: C.brand, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 16px', fontSize: 16, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy && busy !== g.provider ? .5 : 1 }}>
              {busy === g.provider ? 'Opening…' : `Pay ${inr(data.amount)} with ${g.label}`}
              {g.mode === 'test' && <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 8, opacity: .85 }}>(test)</span>}
            </button>
          ))}
          <button onClick={check} style={{ background: 'none', border: 'none', color: C.mute, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 6 }}>Already paid? Check again</button>
        </div>
      )}
    </Card></Shell>
  )
}