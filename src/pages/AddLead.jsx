import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { createLead } from '../api/leads'

/* ═══════════════════════════════════════════════════════════════
   EnrollIQ — Add Lead
   A real creation form (the old file was a copy of LeadDetail).
   POSTs to createLead → /api/leads, then goes to the new lead.
   ═══════════════════════════════════════════════════════════════ */

const GRADES  = ['Pre-KG','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
                 'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']
const SOURCES = ['Google Ads','Facebook','Instagram','WhatsApp','Website','Referral','Walk-in','Phone Call','Form','Other']
const STATUSES = ['New','Contacted','Campus Visit','Admission','Lost']

export default function AddLead() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    parent_name: '',
    phone: '',
    email: '',
    child_grade: '',
    area: '',
    lead_source: 'Form',
    keyword: '',
    status: 'New',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.parent_name.trim() || !form.phone.trim()) {
      setError('Parent name and phone are required.')
      return
    }
    setSaving(true); setError('')
    try {
      const res = await createLead(form)
      const newId = res?.data?.id
      if (newId) navigate(`/leads/${newId}`)
      else navigate('/leads')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create lead. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="page" style={{ maxWidth: 760 }}>
        <button onClick={() => navigate('/leads')} className="btn-ghost text-sm mb-4">← Back to leads</button>

        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">Add New Lead</h1>
            <p className="text-gray-400 text-sm mt-1">Capture a parent enquiry</p>
          </div>
        </div>

        <form onSubmit={submit} className="card" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {error && (
            <div className="badge badge-red" style={{ padding:'10px 14px', borderRadius:8 }}>{error}</div>
          )}

          {/* Parent */}
          <div className="grid grid-cols-2 gap-4 g-2">
            <div>
              <label className="label">Parent name *</label>
              <input className="input" value={form.parent_name} onChange={set('parent_name')}
                placeholder="e.g. Sunita Reddy" required autoFocus />
            </div>
            <div>
              <label className="label">Phone *</label>
              <input className="input" value={form.phone} onChange={set('phone')}
                placeholder="10-digit mobile" required />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')}
              placeholder="parent@email.com" />
          </div>

          {/* Child + area */}
          <div className="grid grid-cols-2 gap-4 g-2">
            <div>
              <label className="label">Child grade</label>
              <select className="input" value={form.child_grade} onChange={set('child_grade')}>
                <option value="">Select grade</option>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Area</label>
              <input className="input" value={form.area} onChange={set('area')}
                placeholder="e.g. Madhapur" />
            </div>
          </div>

          {/* Source + keyword */}
          <div className="grid grid-cols-2 gap-4 g-2">
            <div>
              <label className="label">Lead source</label>
              <select className="input" value={form.lead_source} onChange={set('lead_source')}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Keyword</label>
              <input className="input" value={form.keyword} onChange={set('keyword')}
                placeholder="e.g. best school madhapur" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={set('notes')}
              placeholder="Anything useful about this enquiry…" />
          </div>

          <div style={{ display:'flex', gap:10, paddingTop:4 }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Adding…' : '+ Add lead'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => navigate('/leads')}>Cancel</button>
          </div>
        </form>
      </div>
    </Layout>
  )
}