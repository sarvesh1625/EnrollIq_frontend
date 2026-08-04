import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

/* ═══════════════════════════════════════════════════════════════
   EnrollIQ — School Kit
   Tabs: Overview · Issue Kit · Items & Templates
   Standalone payment tracking (Paid/Unpaid per item)
   ═══════════════════════════════════════════════════════════════ */

const CATEGORIES  = ['Books', 'Uniform', 'Stationery', 'Footwear', 'Accessories', 'Other']
const CAT_ICON    = { Books:'📚', Uniform:'👕', Stationery:'✏️', Footwear:'👟', Accessories:'🎒', Other:'📦' }
const CLASSES     = ['Pre-KG','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']
const CLOTH_SIZES = ['XS','S','M','L','XL','XXL']
const SHOE_SIZES  = ['1','2','3','4','5','6','7','8','9','10','11','12']

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

/* ─── Mock fallback (demo without backend) ─────────────────────── */
const MOCK_ITEMS = [
  { id:1, name:'Textbook Set', category:'Books', price:1800, has_sizes:0 },
  { id:2, name:'Summer Uniform Set', category:'Uniform', price:950, has_sizes:1, size_type:'clothing' },
  { id:3, name:'School Shoes (Black)', category:'Footwear', price:780, has_sizes:1, size_type:'shoes' },
  { id:4, name:'School Bag', category:'Accessories', price:650, has_sizes:0 },
  { id:5, name:'Stationery Kit', category:'Stationery', price:250, has_sizes:0 },
  { id:6, name:'ID Card + Lanyard', category:'Accessories', price:80, has_sizes:0 },
]
const MOCK_STUDENTS = [
  { id:1, name:'Gunakshi', roll_number:'S-001', class:'Grade 1', section:'A', total_items:6, issued_items:6, paid_items:6 },
  { id:2, name:'Tokala',   roll_number:'S-002', class:'LKG',     section:'A', total_items:6, issued_items:2, paid_items:2 },
  { id:3, name:'Sarvesh',  roll_number:'S-003', class:'LKG',     section:'B', total_items:6, issued_items:0, paid_items:0 },
]
const MOCK_CHECKLIST = MOCK_ITEMS.map((i, idx) => ({
  id: idx + 1, item_id: i.id, name: i.name, category: i.category, price: i.price,
  has_sizes: i.has_sizes, size_type: i.size_type, quantity: 1,
  status: idx < 2 ? 'Issued' : 'Pending', size: idx === 1 ? 'M' : null,
  payment_status: idx < 2 ? 'Paid' : 'Unpaid', issued_by_name: idx < 2 ? 'Admin User' : null,
}))
const MOCK_OVERVIEW = {
  kpis: { total_students:3, total_items:6, items_issued:8, items_pending:10, revenue_collected:5460, revenue_pending:7800 },
  classes: [
    { class:'LKG',     students:2, total_items:12, issued_items:2 },
    { class:'Grade 1', students:1, total_items:6,  issued_items:6 },
  ],
  recent: [
    { issued_at:new Date().toISOString(), item_name:'Summer Uniform Set', student_name:'Gunakshi', class:'Grade 1', section:'A', issued_by_name:'Admin User' },
  ],
}

/* ─── Small shared bits ────────────────────────────────────────── */
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: wide ? 620 : 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

function Progress({ pct, color = 'var(--c-brand)' }) {
  return (
    <div style={{ height:6, background:'#f0ede6', borderRadius:99, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${Math.min(100, pct)}%`, background:color, borderRadius:99, transition:'width .3s' }} />
    </div>
  )
}

/* ═══ TAB 1 — OVERVIEW ═════════════════════════════════════════ */
function OverviewTab({ goIssue }) {
  const [data, setData] = useState(MOCK_OVERVIEW)
  useEffect(() => { api.get('/kit/overview').then(r => setData(r.data)).catch(() => {}) }, [])
  const { kpis, classes, recent } = data
  const totalItems = Number(kpis.items_issued) + Number(kpis.items_pending)
  const pctIssued  = totalItems ? Math.round((kpis.items_issued / totalItems) * 100) : 0

  return (
    <div className="fade-up">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-6 g-4">
        {[
          { label:'Items issued',      value:`${kpis.items_issued}`, sub:`of ${totalItems} total · ${pctIssued}%`, accent:true },
          { label:'Items pending',     value: kpis.items_pending,    sub:'across all students' },
          { label:'Kit revenue (paid)', value: fmt(kpis.revenue_collected), sub:'standalone tracking' },
          { label:'Payment pending',   value: fmt(kpis.revenue_pending),   sub:'to be collected' },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <p className="label">{k.label}</p>
            <p className={`font-serif text-3xl font-bold mt-1 ${k.accent ? 'text-brand-600' : 'text-ink'}`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 kit-split">
        {/* Class-wise progress */}
        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-ink text-sm">Class-wise kit progress</h2>
            <button className="btn-ghost text-xs" onClick={goIssue}>Issue kits →</button>
          </div>
          <div className="flex flex-col gap-4">
            {classes.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No students yet</p>}
            {classes.map(c => {
              const pct = c.total_items ? Math.round((c.issued_items / c.total_items) * 100) : 0
              return (
                <div key={c.class}>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <span className="text-sm font-medium text-ink">{c.class}
                      <span className="text-xs text-gray-400 font-normal"> · {c.students} student{c.students > 1 ? 's' : ''}</span>
                    </span>
                    <span className={`text-xs font-semibold ${pct === 100 ? 'text-green-600' : pct > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {c.issued_items}/{c.total_items} items · {pct}%
                    </span>
                  </div>
                  <Progress pct={pct} color={pct === 100 ? 'var(--c-green)' : 'var(--c-brand)'} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent issues feed */}
        <div className="card">
          <h2 className="font-semibold text-ink text-sm mb-4">Recently issued</h2>
          <div className="flex flex-col gap-3">
            {recent.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Nothing issued yet</p>}
            {recent.map((r, i) => (
              <div key={i} className="flex gap-3">
                <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--c-green-lt)', color:'var(--c-green)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>✓</div>
                <div style={{ minWidth:0 }}>
                  <p className="text-xs font-medium text-ink" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.item_name}</p>
                  <p className="text-xs text-gray-400">{r.student_name} · {r.class}-{r.section}
                    {r.issued_by_name ? ` · by ${r.issued_by_name}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══ TAB 2 — ISSUE KIT ════════════════════════════════════════ */
function IssueTab({ showToast }) {
  const [students, setStudents]   = useState(MOCK_STUDENTS)
  const [classFilter, setClassFilter] = useState('All')
  const [search, setSearch]       = useState('')
  const [active, setActive]       = useState(null)     // { student, checklist, total_value, paid_value }
  const [selected, setSelected]   = useState({})       // issueId -> true
  const [sizes, setSizes]         = useState({})       // issueId -> size
  const [markPaid, setMarkPaid]   = useState(true)
  const [saving, setSaving]       = useState(false)

  const loadStudents = useCallback(() => {
    api.get('/kit/students', { params: classFilter !== 'All' ? { class: classFilter } : {} })
      .then(r => setStudents(r.data))
      .catch(() => setStudents(MOCK_STUDENTS))
  }, [classFilter])
  useEffect(loadStudents, [loadStudents])

  const openStudent = (s) => {
    setSelected({}); setSizes({})
    api.get(`/kit/students/${s.id}`)
      .then(r => setActive(r.data))
      .catch(() => setActive({
        student: s, checklist: MOCK_CHECKLIST,
        total_value: MOCK_CHECKLIST.reduce((a, r) => a + r.price, 0),
        paid_value:  MOCK_CHECKLIST.filter(r => r.payment_status === 'Paid').reduce((a, r) => a + r.price, 0),
      }))
  }

  const pending = active ? active.checklist.filter(r => r.status === 'Pending') : []
  const toggleRow  = (id) => setSelected(s => ({ ...s, [id]: !s[id] }))
  const selectAll  = () => setSelected(Object.fromEntries(pending.map(r => [r.id, true])))
  const selCount   = Object.values(selected).filter(Boolean).length

  const doIssue = async () => {
    const ids = Object.keys(selected).filter(k => selected[k]).map(Number)
    if (!ids.length) { showToast('Select at least one item'); return }
    // sizes required for sized items
    for (const id of ids) {
      const row = active.checklist.find(r => r.id === id)
      if (row?.has_sizes && !sizes[id]) { showToast(`Pick a size for ${row.name}`); return }
    }
    setSaving(true)
    try {
      await api.post('/kit/issue', { issue_ids: ids, size_map: sizes, mark_paid: markPaid })
      showToast(`${ids.length} item(s) issued ✓`)
    } catch {
      showToast(`${ids.length} item(s) issued ✓ (demo)`)
    }
    setSaving(false)
    openStudent(active.student); loadStudents()
  }

  const rowUpdate = async (row, body) => {
    try { await api.put(`/kit/issues/${row.id}`, body) } catch {}
    openStudent(active.student); loadStudents()
  }

  const filtered = students.filter(s =>
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.roll_number || '').toLowerCase().includes(search.toLowerCase())))

  return (
    <div className="fade-up grid grid-cols-3 gap-6 kit-split">
      {/* LEFT — student list */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Search name or roll no..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input" style={{ width:110, flexShrink:0 }} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option>All</option>{CLASSES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="card" style={{ padding:8, maxHeight:'62vh', overflowY:'auto' }}>
          {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No students found</p>}
          {filtered.map(s => {
            const pct = s.total_items ? Math.round((s.issued_items / s.total_items) * 100) : 0
            const isActive = active?.student?.id === s.id
            return (
              <button key={s.id} onClick={() => openStudent(s)}
                className="w-full text-left rounded-xl transition-colors"
                style={{ padding:'10px 12px', border:'none', cursor:'pointer',
                  background: isActive ? 'var(--c-brand-lt)' : 'transparent' }}>
                <div className="flex items-center justify-between gap-2">
                  <div style={{ minWidth:0 }}>
                    <p className="text-sm font-medium text-ink" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</p>
                    <p className="text-xs text-gray-400">{s.roll_number} · {s.class}-{s.section}</p>
                  </div>
                  {pct === 100
                    ? <span className="badge badge-green">✓ Full</span>
                    : pct > 0
                      ? <span className="badge badge-amber">{pct}%</span>
                      : <span className="badge badge-gray">Pending</span>}
                </div>
                <div className="mt-2"><Progress pct={pct} color={pct === 100 ? 'var(--c-green)' : 'var(--c-brand)'} /></div>
              </button>
            )
          })}
        </div>
      </div>

      {/* RIGHT — checklist */}
      <div className="col-span-2">
        {!active ? (
          <div className="card empty-state" style={{ minHeight:320, display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div className="empty-icon">🎒</div>
            <p className="empty-title">Select a student</p>
            <p className="empty-sub">Their kit checklist is generated automatically from the class template</p>
          </div>
        ) : (
          <div className="card" style={{ padding:0 }}>
            {/* Student header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--c-border)', display:'flex',
              justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
              <div>
                <p className="font-serif text-lg font-bold text-ink">{active.student.name}</p>
                <p className="text-xs text-gray-400">{active.student.roll_number} · {active.student.class}-{active.student.section}
                  · Kit value {fmt(active.total_value)} · Paid {fmt(active.paid_value)}</p>
              </div>
              {pending.length > 0 && (
                <button className="btn-ghost text-xs" onClick={selectAll}>Select all pending ({pending.length})</button>
              )}
            </div>

            {/* Checklist rows */}
            <div style={{ maxHeight:'46vh', overflowY:'auto' }}>
              {active.checklist.map(row => {
                const issued = row.status === 'Issued'
                const sizeOpts = row.size_type === 'shoes' ? SHOE_SIZES : CLOTH_SIZES
                return (
                  <div key={row.id} style={{ padding:'12px 20px', borderBottom:'1px solid #faf9f7',
                    display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
                    background: selected[row.id] ? 'var(--c-brand-lt)' : 'transparent' }}>
                    {/* checkbox / done */}
                    {issued
                      ? <span style={{ width:20, textAlign:'center', color:'var(--c-green)', fontWeight:700 }}>✓</span>
                      : <input type="checkbox" checked={!!selected[row.id]} onChange={() => toggleRow(row.id)}
                          style={{ width:16, height:16, accentColor:'var(--c-brand)', cursor:'pointer' }} />}

                    <span style={{ fontSize:16 }}>{CAT_ICON[row.category] || '📦'}</span>

                    <div style={{ flex:1, minWidth:140 }}>
                      <p className="text-sm font-medium text-ink">
                        {row.name}{row.quantity > 1 ? ` × ${row.quantity}` : ''}
                      </p>
                      <p className="text-xs text-gray-400">
                        {row.category} · {fmt(row.price)}
                        {issued && row.size ? ` · Size ${row.size}` : ''}
                        {issued && row.issued_by_name ? ` · by ${row.issued_by_name}` : ''}
                      </p>
                    </div>

                    {/* size picker for pending sized items */}
                    {!issued && !!row.has_sizes && (
                      <select className="input" style={{ width:88, flexShrink:0 }}
                        value={sizes[row.id] || ''} onChange={e => setSizes(s => ({ ...s, [row.id]: e.target.value }))}>
                        <option value="">Size…</option>
                        {sizeOpts.map(sz => <option key={sz}>{sz}</option>)}
                      </select>
                    )}

                    {/* payment pill (standalone tracking) */}
                    <button onClick={() => rowUpdate(row, { payment_status: row.payment_status === 'Paid' ? 'Unpaid' : 'Paid' })}
                      className={`badge ${row.payment_status === 'Paid' ? 'badge-green' : 'badge-amber'}`}
                      style={{ border:'none', cursor:'pointer' }}
                      title="Click to toggle payment">
                      {row.payment_status === 'Paid' ? '₹ Paid' : '₹ Unpaid'}
                    </button>

                    {/* status / undo */}
                    {issued
                      ? <button className="btn-ghost" style={{ padding:'5px 10px', fontSize:11 }}
                          onClick={() => rowUpdate(row, { status:'Pending' })}>Undo</button>
                      : <span className="badge badge-gray">Pending</span>}
                  </div>
                )
              })}
            </div>

            {/* Issue bar */}
            {pending.length > 0 && (
              <div style={{ padding:'14px 20px', borderTop:'1px solid var(--c-border)', display:'flex',
                alignItems:'center', gap:14, flexWrap:'wrap', background:'var(--c-surface-2)',
                borderRadius:'0 0 16px 16px' }}>
                <label style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, color:'var(--c-ink-2)', cursor:'pointer' }}>
                  <input type="checkbox" checked={markPaid} onChange={e => setMarkPaid(e.target.checked)}
                    style={{ accentColor:'var(--c-brand)' }} />
                  Mark selected as Paid
                </label>
                <div style={{ flex:1 }} />
                <button className="btn-primary" disabled={saving || selCount === 0} onClick={doIssue}>
                  {saving ? 'Issuing…' : `✓ Issue ${selCount || ''} item${selCount === 1 ? '' : 's'}`}
                </button>
              </div>
            )}
            {pending.length === 0 && (
              <div style={{ padding:'14px 20px', textAlign:'center', color:'var(--c-green)', fontSize:13, fontWeight:600 }}>
                🎉 Full kit issued to {active.student.name}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══ TAB 3 — ITEMS & TEMPLATES ════════════════════════════════ */
function ItemModal({ initial, onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    name: initial?.name || '', category: initial?.category || 'Books',
    price: initial?.price || '', has_sizes: !!initial?.has_sizes,
    size_type: initial?.size_type || 'clothing',
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const payload = { ...form, price: Number(form.price) || 0, has_sizes: form.has_sizes ? 1 : 0 }
    try {
      if (initial) await api.put(`/kit/items/${initial.id}`, payload)
      else         await api.post('/kit/items', payload)
      showToast(initial ? 'Item updated ✓' : 'Item added ✓')
    } catch { showToast('Saved (demo)') }
    setSaving(false); onSaved(); onClose()
  }

  return (
    <Modal title={initial ? 'Edit kit item' : 'Add kit item'} onClose={onClose}>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <label className="label">Item name *</label>
          <input className="input" value={form.name} onChange={set('name')} required placeholder="e.g. Summer Uniform Set" autoFocus />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={set('category')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Price (₹)</label>
            <input className="input" type="number" min="0" value={form.price} onChange={set('price')} placeholder="0" />
          </div>
        </div>
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--c-ink-2)', cursor:'pointer' }}>
          <input type="checkbox" checked={form.has_sizes} onChange={set('has_sizes')} style={{ accentColor:'var(--c-brand)' }} />
          This item comes in sizes (uniforms, shoes)
        </label>
        {form.has_sizes && (
          <div>
            <label className="label">Size type</label>
            <select className="input" value={form.size_type} onChange={set('size_type')}>
              <option value="clothing">Clothing (XS–XXL)</option>
              <option value="shoes">Shoes (1–12)</option>
            </select>
          </div>
        )}
        <div style={{ display:'flex', gap:10, paddingTop:4 }}>
          <button type="submit" className="btn-primary" style={{ flex:1 }} disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Update item' : 'Add item'}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

function ItemsTab({ showToast }) {
  const [items, setItems]       = useState(MOCK_ITEMS)
  const [showAdd, setShowAdd]   = useState(false)
  const [editing, setEditing]   = useState(null)
  const [tplClass, setTplClass] = useState('Grade 1')
  const [tpl, setTpl]           = useState({})   // item_id -> quantity
  const [tplSaving, setTplSaving] = useState(false)

  const load = useCallback(() => {
    api.get('/kit/items').then(r => setItems(r.data)).catch(() => setItems(MOCK_ITEMS))
  }, [])
  useEffect(load, [load])

  const loadTpl = useCallback(() => {
    api.get(`/kit/templates/${encodeURIComponent(tplClass)}`)
      .then(r => setTpl(Object.fromEntries(r.data.map(t => [t.item_id, t.quantity]))))
      .catch(() => setTpl(Object.fromEntries(MOCK_ITEMS.map(i => [i.id, 1]))))
  }, [tplClass])
  useEffect(loadTpl, [loadTpl])

  const toggleTpl = (id) => setTpl(t => {
    const n = { ...t }
    if (n[id]) delete n[id]; else n[id] = 1
    return n
  })
  const setQty = (id, q) => setTpl(t => ({ ...t, [id]: Math.max(1, parseInt(q) || 1) }))

  const saveTpl = async () => {
    setTplSaving(true)
    const payload = { items: Object.entries(tpl).map(([item_id, quantity]) => ({ item_id: Number(item_id), quantity })) }
    try { await api.put(`/kit/templates/${encodeURIComponent(tplClass)}`, payload); showToast(`${tplClass} kit template saved ✓`) }
    catch { showToast('Template saved (demo)') }
    setTplSaving(false)
  }

  const removeItem = async (item) => {
    if (!confirm(`Remove "${item.name}" from the items master?`)) return
    try { await api.delete(`/kit/items/${item.id}`) } catch {}
    showToast('Item removed'); load()
  }

  const tplTotal = items.filter(i => tpl[i.id]).reduce((s, i) => s + Number(i.price) * (tpl[i.id] || 1), 0)

  return (
    <div className="fade-up grid grid-cols-3 gap-6 kit-split">
      {/* Items master */}
      <div className="col-span-2">
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--c-border)', display:'flex',
            justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <h2 className="font-semibold text-ink text-sm">Kit items master ({items.length})</h2>
            <button className="btn-primary" style={{ padding:'7px 14px', fontSize:12 }} onClick={() => setShowAdd(true)}>+ Add item</button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="w-full text-sm" style={{ minWidth:560 }}>
              <thead>
                <tr className="border-b border-gray-100 bg-cream">
                  {['Item','Category','Price','Sizes',''].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(i => (
                  <tr key={i.id} className="hover:bg-cream">
                    <td className="px-5 py-3">
                      <span style={{ marginRight:8 }}>{CAT_ICON[i.category] || '📦'}</span>
                      <span className="font-medium text-ink text-sm">{i.name}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{i.category}</td>
                    <td className="px-5 py-3 text-xs font-semibold text-ink">{fmt(i.price)}</td>
                    <td className="px-5 py-3">
                      {i.has_sizes
                        ? <span className="badge badge-blue">{i.size_type === 'shoes' ? 'Shoe sizes' : 'XS–XXL'}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right" style={{ whiteSpace:'nowrap' }}>
                      <button className="text-xs text-brand-600 hover:underline" style={{ marginRight:12 }} onClick={() => setEditing(i)}>Edit</button>
                      <button className="text-xs text-red-400 hover:underline" onClick={() => removeItem(i)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Class template builder */}
      <div className="card" style={{ alignSelf:'start' }}>
        <h2 className="font-semibold text-ink text-sm mb-1">Class kit template</h2>
        <p className="text-xs text-gray-400 mb-4">New students in this class get this checklist automatically</p>
        <select className="input mb-4" value={tplClass} onChange={e => setTplClass(e.target.value)}>
          {CLASSES.map(c => <option key={c}>{c}</option>)}
        </select>
        <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:'38vh', overflowY:'auto', marginBottom:14 }}>
          {items.map(i => (
            <div key={i.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" checked={!!tpl[i.id]} onChange={() => toggleTpl(i.id)}
                style={{ accentColor:'var(--c-brand)', flexShrink:0 }} />
              <span className="text-xs text-ink" style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {i.name} <span className="text-gray-400">· {fmt(i.price)}</span>
              </span>
              {!!tpl[i.id] && (
                <input type="number" min="1" className="input" style={{ width:52, padding:'4px 8px', fontSize:12, flexShrink:0 }}
                  value={tpl[i.id]} onChange={e => setQty(i.id, e.target.value)} title="Quantity" />
              )}
            </div>
          ))}
        </div>
        <div style={{ borderTop:'1px solid var(--c-border)', paddingTop:12, display:'flex',
          justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div>
            <p className="text-xs text-gray-400">{Object.keys(tpl).length} items in kit</p>
            <p className="font-serif text-lg font-bold text-brand-600">{fmt(tplTotal)}</p>
          </div>
          <button className="btn-primary" style={{ padding:'8px 16px', fontSize:12 }} disabled={tplSaving} onClick={saveTpl}>
            {tplSaving ? 'Saving…' : `Save ${tplClass} kit`}
          </button>
        </div>
      </div>

      {showAdd && <ItemModal onClose={() => setShowAdd(false)} onSaved={load} showToast={showToast} />}
      {editing && <ItemModal initial={editing} onClose={() => setEditing(null)} onSaved={load} showToast={showToast} />}
    </div>
  )
}

/* ═══ PAGE ═════════════════════════════════════════════════════ */
export default function SchoolKit() {
  const [tab, setTab]     = useState('overview')
  const [toast, setToast] = useState('')
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2600) }

  const TABS = [
    { key:'overview', label:'Overview' },
    { key:'issue',    label:'Issue Kit' },
    { key:'items',    label:'Items & Templates' },
  ]

  return (
    <Layout>
      <div className="page">
        {toast && <div className="toast">{toast}</div>}

        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">🎒 School Kit</h1>
            <p className="text-gray-400 text-sm mt-1">Books · Uniforms · Stationery — track distribution per student</p>
          </div>
        </div>

        <div className="tabs-strip mb-6">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`text-xs px-4 py-2 rounded-md transition-colors font-medium ${
                tab === t.key ? 'bg-ink text-white' : 'text-gray-500 hover:bg-cream'
              }`}>{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab goIssue={() => setTab('issue')} />}
        {tab === 'issue'    && <IssueTab showToast={showToast} />}
        {tab === 'items'    && <ItemsTab showToast={showToast} />}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .kit-split { grid-template-columns: 1fr !important; }
          .kit-split > .col-span-2 { grid-column: span 1 !important; }
        }
      `}</style>
    </Layout>
  )
}