import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const GRADES = ['Pre-LKG','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']
const TYPES = [
  { key:'diary',    label:'📔 Diary',    color:'#2563eb' },
  { key:'homework', label:'📝 Homework', color:'#d97706' },
  { key:'activity', label:'🎨 Activity', color:'#16a34a' },
]

export default function DailyUpdates() {
  const [posts, setPosts]       = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filterClass, setFilterClass] = useState('All')
  const [toast, setToast]       = useState('')

  const [form, setForm] = useState({
    post_type: 'diary', target: 'class', class_name: 'Grade 1', student_id: '',
    title: '', description: '', subject: '', due_date: '',
    post_date: new Date().toISOString().slice(0,10),
  })
  const [files, setFiles] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const params = filterClass !== 'All' ? { class_name: filterClass } : {}
      const [p, s] = await Promise.allSettled([
        api.get('/diary', { params }),
        api.get('/students', { params: { limit: 500 } }),
      ])
      if (p.status === 'fulfilled') setPosts(p.value.data || [])
      if (s.status === 'fulfilled') setStudents(s.value.data.students || [])
    } catch {}
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filterClass])

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2500) }

  const submit = async () => {
    if (!form.title.trim()) { showToast('Add a title'); return }
    const payload = {
      post_type: form.post_type,
      title: form.title, description: form.description,
      subject: form.subject || null,
      due_date: form.due_date || null,
      post_date: form.post_date,
    }
    if (form.target === 'class') payload.class_name = form.class_name
    else { payload.student_id = form.student_id; if (!form.student_id) { showToast('Pick a student'); return } }

    try {
      const fd = new FormData()
      Object.entries(payload).forEach(([k, v]) => { if (v != null) fd.append(k, v) })
      files.forEach(f => fd.append('files', f))
      await api.post('/diary', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      showToast('Posted ✓')
      setForm(f => ({ ...f, title:'', description:'', subject:'', due_date:'' }))
      setFiles([])
      load()
    } catch (e) { showToast(e.response?.data?.message || 'Failed to post') }
  }

  const del = async (id) => {
    if (!confirm('Delete this post?')) return
    try { await api.delete(`/diary/${id}`); load() } catch {}
  }

  const typeMeta = (t) => TYPES.find(x => x.key === t) || TYPES[0]
  const classStudents = students.filter(s => s.class === form.class_name)

  return (
    <Layout>
      <div className="page">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:8 }}>
          <div>
            <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'var(--c-ink)', margin:0 }}>📔 Daily Updates</h1>
            <p className="text-sm text-gray-500" style={{ margin:'2px 0 0' }}>Post diary, homework and activities — parents see them in the app.</p>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,380px) 1fr', gap:20, alignItems:'start' }} className="du-grid">
          {/* Compose */}
          <div className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <p className="text-sm font-semibold text-ink">New Post</p>

            <div style={{ display:'flex', gap:6 }}>
              {TYPES.map(t => (
                <button key={t.key} onClick={() => setForm(f => ({ ...f, post_type:t.key }))}
                  className={form.post_type===t.key ? 'btn-primary' : 'btn-ghost'} style={{ flex:1, fontSize:12, padding:'8px 6px' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* target */}
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setForm(f => ({ ...f, target:'class' }))}
                className={form.target==='class'?'btn-primary':'btn-ghost'} style={{ flex:1, fontSize:12 }}>Whole class</button>
              <button onClick={() => setForm(f => ({ ...f, target:'student' }))}
                className={form.target==='student'?'btn-primary':'btn-ghost'} style={{ flex:1, fontSize:12 }}>One student</button>
            </div>

            <div>
              <label className="label">Class</label>
              <select className="input" value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name:e.target.value, student_id:'' }))}>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>

            {form.target === 'student' && (
              <div>
                <label className="label">Student</label>
                <select className="input" value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id:e.target.value }))}>
                  <option value="">Select…</option>
                  {classStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))}
                placeholder={form.post_type==='homework' ? 'e.g. Maths — Exercise 5' : 'e.g. Today we learned about plants'} />
            </div>

            <div>
              <label className="label">Details</label>
              <textarea className="input" style={{ minHeight:70 }} value={form.description}
                onChange={e => setForm(f => ({ ...f, description:e.target.value }))} placeholder="Describe the update…" />
            </div>

            {form.post_type === 'homework' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label className="label">Subject</label>
                  <input className="input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject:e.target.value }))} placeholder="Maths" />
                </div>
                <div>
                  <label className="label">Due date</label>
                  <input type="date" className="input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date:e.target.value }))} />
                </div>
              </div>
            )}

            <div>
              <label className="label">Post date</label>
              <input type="date" className="input" value={form.post_date} onChange={e => setForm(f => ({ ...f, post_date:e.target.value }))} />
            </div>

            <div>
              <label className="label">Attachments (images, PDFs, files)</label>
              <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                onChange={e => setFiles(Array.from(e.target.files || []))}
                style={{ fontSize:13 }} />
              {files.length > 0 && (
                <div style={{ marginTop:6, fontSize:12, color:'var(--c-muted)' }}>
                  {files.map((f, i) => <div key={i}>📎 {f.name}</div>)}
                </div>
              )}
            </div>
            <button className="btn-primary" onClick={submit}>Post update</button>
          </div>

          {/* Feed */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <p className="text-sm font-semibold text-ink">Recent Posts</p>
              <select className="input" style={{ width:150 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                <option>All</option>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>

            {loading ? <p className="text-sm text-gray-400">Loading…</p>
             : posts.length === 0 ? <div className="card" style={{ textAlign:'center', padding:30 }}><p className="text-sm text-gray-400">No posts yet.</p></div>
             : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {posts.map(p => {
                  const tm = typeMeta(p.post_type)
                  return (
                    <div key={p.id} className="card" style={{ padding:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                        <div>
                          <span className="badge" style={{ background:tm.color+'22', color:tm.color, fontSize:11 }}>{tm.label}</span>
                          <span className="text-xs text-gray-400" style={{ marginLeft:8 }}>
                            {p.student_name ? `👤 ${p.student_name}` : `🏫 ${p.class_name}`} · {new Date(p.post_date).toLocaleDateString()}
                          </span>
                        </div>
                        <button onClick={() => del(p.id)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:13 }}>🗑</button>
                      </div>
                      <p className="text-sm font-semibold text-ink" style={{ marginTop:8 }}>{p.title}</p>
                      {p.description && <p className="text-sm text-gray-600" style={{ marginTop:2 }}>{p.description}</p>}
                      {p.post_type==='homework' && (p.subject || p.due_date) && (
                        <p className="text-xs" style={{ color:'#d97706', marginTop:6 }}>
                          {p.subject ? `${p.subject}` : ''}{p.due_date ? ` · Due ${new Date(p.due_date).toLocaleDateString()}` : ''}
                        </p>
                      )}
                      {Array.isArray(p.attachments) && p.attachments.length > 0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
                          {p.attachments.map((a, ai) => (
                            a.type === 'image'
                              ? <a key={ai} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt="" style={{ width:70, height:70, objectFit:'cover', borderRadius:8, border:'1px solid var(--c-border)' }} /></a>
                              : <a key={ai} href={a.url} target="_blank" rel="noreferrer" className="badge badge-gray" style={{ fontSize:11 }}>📎 {a.name || 'file'}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            }
          </div>
        </div>
      </div>

      {toast && <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#111827', color:'#fff', padding:'10px 18px', borderRadius:10, fontSize:13, zIndex:1000 }}>{toast}</div>}
      <style>{`@media (max-width:768px){ .du-grid{ grid-template-columns:1fr !important; } }`}</style>
    </Layout>
  )
}