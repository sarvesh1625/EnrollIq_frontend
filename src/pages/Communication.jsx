import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import {
  getCommStats, getMessages, sendMessage,
  getAnnouncements, sendAnnouncement,
  getNotifications, markAllRead,
} from '../api/communication'

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_STATS = { sent_today: 24, total_messages: 312, announcements_sent: 18, failed: 2 }

const MOCK_MESSAGES = [
  { id:1, recipient_name:'Suresh Pillai',  recipient_phone:'9876500007', student_name:'Arjun Pillai',   student_class:'Grade 4', channel:'WhatsApp', body:'Fee receipt sent for ₹45,000 — Term 2 Tuition. Thank you!', status:'Delivered', sent_at:'2026-04-08T10:45:00Z', sent_by_name:'Admin' },
  { id:2, recipient_name:'Naresh Verma',   recipient_phone:'9876500003', student_name:'Ankit Verma',    student_class:'Grade 8', channel:'SMS',       body:'Reminder: ₹55,000 fee due on 01 Apr 2026. Please pay to avoid late charges.', status:'Delivered', sent_at:'2026-04-08T09:00:00Z', sent_by_name:'Admin' },
  { id:3, recipient_name:'Ajay Nair',      recipient_phone:'9876500002', student_name:'Priya Nair',     student_class:'Grade 3', channel:'WhatsApp', body:'Your fee of ₹20,000 is overdue since 15 Mar. Please clear immediately.', status:'Delivered', sent_at:'2026-04-07T14:00:00Z', sent_by_name:'Admin' },
  { id:4, recipient_name:'Rakesh Kumar',   recipient_phone:'9876500008', student_name:'Deepa Kumar',    student_class:'Grade 2', channel:'WhatsApp', body:'Campus visit confirmed for Saturday 10 AM. Please bring documents.', status:'Sent',      sent_at:'2026-04-07T11:30:00Z', sent_by_name:'Admin' },
  { id:5, recipient_name:'Krishnam Reddy', recipient_phone:'9876500005', student_name:'Mohan Reddy',    student_class:'Grade 6', channel:'SMS',       body:'Transport fee of ₹12,000 is due on 05 Apr 2026.', status:'Failed',    sent_at:'2026-04-07T09:15:00Z', sent_by_name:'Admin' },
]

const MOCK_ANNOUNCEMENTS = [
  { id:1, title:'Parent-teacher meeting', body:'Dear Parents, PTM is scheduled on 12 April at 10 AM in school hall. Please attend.', audience:'All', channel:'WhatsApp', recipient_count:498, status:'Sent', sent_at:'2026-04-07T08:00:00Z', sent_by_name:'Admin' },
  { id:2, title:'Grade 4 field trip notice', body:'Grade 4 students will have a field trip to Science City on 15 April. Fee: ₹500.', audience:'Grade-wise', audience_filter:'Grade 4', channel:'WhatsApp', recipient_count:42, status:'Sent', sent_at:'2026-04-06T10:00:00Z', sent_by_name:'Admin' },
  { id:3, title:'Summer vacation schedule', body:'School will remain closed from 15 May to 10 June for summer vacation.', audience:'All', channel:'SMS', recipient_count:498, status:'Sent', sent_at:'2026-04-05T09:30:00Z', sent_by_name:'Admin' },
  { id:4, title:'Fee due reminder — April', body:'This is a reminder that Term 2 fees are due by 01 April 2026. Kindly pay on time.', audience:'All', channel:'WhatsApp', recipient_count:498, status:'Sent', sent_at:'2026-03-28T08:00:00Z', sent_by_name:'Admin' },
]

const MOCK_NOTIFICATIONS = [
  { id:1, type:'lead_alert',        title:'New hot lead', body:'Ravi Sharma (Grade 5) scored 91 — needs immediate callback', link:'/leads', is_read:false, created_at:'2026-04-08T10:32:00Z' },
  { id:2, type:'fee_reminder',      title:'Overdue fees', body:'Priya Nair has ₹20,000 overdue since 15 Mar 2026', link:'/fees', is_read:false, created_at:'2026-04-08T09:00:00Z' },
  { id:3, type:'admission_update',  title:'Application admitted', body:'Arjun Pillai (Grade 4) has been admitted', link:'/admissions', is_read:true,  created_at:'2026-04-07T15:00:00Z' },
  { id:4, type:'lead_alert',        title:'New lead from Google Ads', body:'Sunita Reddy (Grade 4) — AI Score 91', link:'/leads', is_read:true,  created_at:'2026-04-07T08:12:00Z' },
  { id:5, type:'system',            title:'Weekly report ready', body:'April Week 1 CRM report is available in Analytics', link:'/analytics', is_read:true, created_at:'2026-04-07T07:00:00Z' },
]

const MOCK_STUDENTS = [
  { id:1, name:'Arjun Pillai',  roll_number:'S-001', class:'Grade 4', parent_name:'Suresh Pillai',  parent_phone:'9876500007' },
  { id:2, name:'Deepa Kumar',   roll_number:'S-002', class:'Grade 2', parent_name:'Rakesh Kumar',   parent_phone:'9876500008' },
  { id:3, name:'Ankit Verma',   roll_number:'S-005', class:'Grade 8', parent_name:'Naresh Verma',   parent_phone:'9876500003' },
  { id:4, name:'Priya Nair',    roll_number:'S-004', class:'Grade 3', parent_name:'Ajay Nair',      parent_phone:'9876500002' },
  { id:5, name:'Mohan Reddy',   roll_number:'S-003', class:'Grade 6', parent_name:'Krishnam Reddy', parent_phone:'9876500005' },
]

const GRADES = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)   return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
}

const CHANNEL_ICON = { WhatsApp: '💬', SMS: '✉️', Email: '📧' }
const STATUS_DOT   = { Delivered:'bg-green-400', Sent:'bg-blue-400', Failed:'bg-red-400', Pending:'bg-amber-400' }

const NOTIF_ICON = {
  lead_alert:       { bg:'bg-brand-50',  text:'text-brand-600',  symbol:'⚡' },
  fee_reminder:     { bg:'bg-amber-50',  text:'text-amber-700',  symbol:'₹'  },
  admission_update: { bg:'bg-green-50',  text:'text-green-700',  symbol:'✓'  },
  system:           { bg:'bg-gray-100',  text:'text-gray-500',   symbol:'ℹ'  },
}

// ── Send Message Modal ────────────────────────────────────────────────────────
function SendMessageModal({ onClose, onSent }) {
  const [form, setForm]   = useState({ student_id:'', channel:'WhatsApp', body:'' })
  const [sending, setSending] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const selectedStudent = MOCK_STUDENTS.find(s => s.id === parseInt(form.student_id))

  const templates = [
    'Fee reminder: Your fee payment is due. Please clear at the earliest.',
    'Campus visit confirmed. Please bring all required documents.',
    'Fee receipt has been generated. Thank you for your payment.',
    'Reminder: Parent-teacher meeting on 12 April at 10 AM.',
  ]

  const handleSend = async e => {
    e.preventDefault()
    setSending(true)
    try {
      await sendMessage({
        ...form,
        student_id:      selectedStudent?.id,
        recipient_name:  selectedStudent?.parent_name,
        recipient_phone: selectedStudent?.parent_phone,
      })
      onSent()
    } catch { onSent() }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-serif text-xl font-bold text-ink">Send message</h2>
          <p className="text-sm text-gray-400 mt-0.5">1-to-1 message to a parent</p>
        </div>
        <form onSubmit={handleSend} className="p-6 flex flex-col gap-4">
          <div>
            <label className="label">Student *</label>
            <select className="input" value={form.student_id} onChange={set('student_id')} required>
              <option value="">Select student</option>
              {MOCK_STUDENTS.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.parent_name} ({s.parent_phone})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Channel</label>
            <div className="flex gap-2">
              {['WhatsApp','SMS','Email'].map(ch => (
                <button key={ch} type="button"
                  onClick={() => setForm(p => ({ ...p, channel: ch }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.channel === ch
                      ? 'bg-ink text-white border-ink'
                      : 'border-gray-200 text-gray-500 hover:bg-cream'
                  }`}>
                  {CHANNEL_ICON[ch]} {ch}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Quick templates</label>
            <div className="flex flex-col gap-1.5">
              {templates.map((t, i) => (
                <button key={i} type="button"
                  onClick={() => setForm(p => ({ ...p, body: t }))}
                  className="text-left text-xs text-gray-500 hover:text-ink px-3 py-2 rounded-lg hover:bg-cream transition-colors border border-gray-100">
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Message *</label>
            <textarea
              className="input resize-none" rows={3}
              value={form.body} onChange={set('body')}
              placeholder="Type your message..." required
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.body.length} chars</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={sending} className="btn-primary flex-1 disabled:opacity-60">
              {sending ? 'Sending...' : `Send via ${form.channel}`}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Announcement Modal ────────────────────────────────────────────────────────
function AnnouncementModal({ onClose, onSent }) {
  const [form, setForm]   = useState({ title:'', body:'', audience:'All', audience_filter:'', channel:'WhatsApp' })
  const [sending, setSending] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const recipientLabel = form.audience === 'All'
    ? 'All parents (498)'
    : form.audience_filter
      ? `${form.audience_filter} parents`
      : 'Select grade below'

  const handleSend = async e => {
    e.preventDefault()
    setSending(true)
    try {
      await sendAnnouncement(form)
      onSent()
    } catch { onSent() }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-serif text-xl font-bold text-ink">Broadcast announcement</h2>
          <p className="text-sm text-gray-400 mt-0.5">Send to multiple parents at once</p>
        </div>
        <form onSubmit={handleSend} className="p-6 flex flex-col gap-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. PTM Notice — April 2026" required />
          </div>
          <div>
            <label className="label">Message *</label>
            <textarea className="input resize-none" rows={4}
              value={form.body} onChange={set('body')}
              placeholder="Type your announcement..." required />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.body.length} chars</p>
          </div>
          <div className="grid grid-cols-2 gap-3 g-2">
            <div>
              <label className="label">Recipients</label>
              <select className="input" value={form.audience} onChange={set('audience')}>
                <option value="All">All parents</option>
                <option value="Grade-wise">Grade-wise</option>
              </select>
            </div>
            <div>
              <label className="label">Channel</label>
              <select className="input" value={form.channel} onChange={set('channel')}>
                <option>WhatsApp</option>
                <option>SMS</option>
                <option>Both</option>
              </select>
            </div>
          </div>
          {form.audience === 'Grade-wise' && (
            <div>
              <label className="label">Select grade</label>
              <select className="input" value={form.audience_filter} onChange={set('audience_filter')} required>
                <option value="">Choose grade</option>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          )}
          <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
            Will be sent to: <strong>{recipientLabel}</strong>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={sending} className="btn-primary flex-1 disabled:opacity-60">
              {sending ? 'Sending...' : 'Send broadcast'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Communication() {
  const [tab, setTab]               = useState('messages')
  const [stats, setStats]           = useState(MOCK_STATS)
  const [messages, setMessages]     = useState(MOCK_MESSAGES)
  const [announcements, setAnnouncements] = useState(MOCK_ANNOUNCEMENTS)
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
  const [unreadCount, setUnreadCount]     = useState(2)
  const [showMsgModal, setShowMsgModal]   = useState(false)
  const [showAnnModal, setShowAnnModal]   = useState(false)
  const [channelFilter, setChannelFilter] = useState('All')

  const load = async () => {
    try {
      const [sRes, mRes, aRes, nRes] = await Promise.all([
        getCommStats(), getMessages(), getAnnouncements(), getNotifications(),
      ])
      setStats(sRes.data)
      setMessages(mRes.data.messages)
      setAnnouncements(aRes.data.announcements)
      setNotifications(nRes.data.notifications)
      setUnreadCount(nRes.data.unread_count)
    } catch { /* stay on mock */ }
  }

  useEffect(() => { load() }, [])

  const filteredMessages = messages.filter(m =>
    channelFilter === 'All' || m.channel === channelFilter
  )

  const handleMarkAllRead = async () => {
    try { await markAllRead() } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const handleSent = () => {
    setShowMsgModal(false)
    setShowAnnModal(false)
    load()
  }

  return (
    <Layout>
      <div className="page">
        {/* Header */}
        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">Communication</h1>
            <p className="text-gray-400 text-sm mt-1">WhatsApp, SMS and announcements</p>
          </div>
          <div className="actions">
            <button onClick={() => setShowAnnModal(true)} className="btn-ghost">
              📢 Broadcast
            </button>
            <button onClick={() => setShowMsgModal(true)} className="btn-primary">
              + Send message
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8 g-4">
          {[
            { label:'Sent today',     value: stats.sent_today,         accent: true },
            { label:'Total messages', value: stats.total_messages,     accent: false },
            { label:'Broadcasts',     value: stats.announcements_sent, accent: false },
            { label:'Failed',         value: stats.failed,             red: true },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p className="label">{s.label}</p>
              <p className={`font-serif text-3xl font-bold mt-1 ${s.accent ? 'text-brand-600' : s.red ? 'text-red-500' : 'text-ink'}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs-strip mb-6">
          {[
            { key:'messages',      label:'Messages' },
            { key:'announcements', label:'Announcements' },
            { key:'notifications', label: unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`text-sm px-4 py-2 rounded-md transition-colors font-medium ${
                tab === t.key ? 'bg-ink text-white' : 'text-gray-500 hover:bg-cream'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── MESSAGES TAB ── */}
        {tab === 'messages' && (
          <>
            <div className="flex gap-3 mb-4" style={{ flexWrap:"wrap", alignItems:"center" }}>
              {['All','WhatsApp','SMS','Email'].map(c => (
                <button key={c} onClick={() => setChannelFilter(c)}
                  className={`text-xs px-4 py-2 rounded-lg border transition-all ${
                    channelFilter === c ? 'bg-ink text-white border-ink' : 'border-gray-200 text-gray-500 hover:bg-cream'
                  }`}>
                  {CHANNEL_ICON[c] || ''} {c}
                </button>
              ))}
              <span className="text-xs text-gray-400 self-center ml-auto">{filteredMessages.length} messages</span>
            </div>
            <div className="card" style={{padding:0,overflowX:"auto"}}>
              {filteredMessages.map((m, i) => (
                <div key={m.id} className={`flex items-start gap-4 px-5 py-4 ${i < filteredMessages.length-1 ? 'border-b border-gray-50' : ''} hover:bg-paper transition-colors`}>
                  <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                    {m.recipient_name?.[0]}
                  </div>
                  <div className="flex-1" style={{ minWidth:0 }}>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-medium text-ink">{m.recipient_name}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{m.student_name} ({m.student_class})</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {CHANNEL_ICON[m.channel]} {m.channel}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed truncate">{m.body}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-xs text-gray-400">{timeAgo(m.sent_at)}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[m.status] || 'bg-gray-300'}`} />
                      <span className="text-xs text-gray-400">{m.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ANNOUNCEMENTS TAB ── */}
        {tab === 'announcements' && (
          <div className="flex flex-col gap-4">
            {announcements.map(a => (
              <div key={a.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-ink">{a.title}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {CHANNEL_ICON[a.channel]} {a.channel}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        a.audience === 'All' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {a.audience === 'All' ? 'All parents' : a.audience_filter}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{a.body}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>👤 {a.recipient_count} recipients</span>
                      <span>🕐 {timeAgo(a.sent_at)}</span>
                      <span>By {a.sent_by_name}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                    a.status === 'Sent' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {tab === 'notifications' && (
          <>
            {unreadCount > 0 && (
              <div className="flex justify-end mb-4">
                <button onClick={handleMarkAllRead} className="text-xs text-brand-600 hover:underline">
                  Mark all as read
                </button>
              </div>
            )}
            <div className="card" style={{padding:0,overflowX:"auto"}}>
              {notifications.map((n, i) => {
                const style = NOTIF_ICON[n.type] || NOTIF_ICON.system
                return (
                  <div key={n.id}
                    className={`flex items-start gap-4 px-5 py-4 ${i < notifications.length-1 ? 'border-b border-gray-50' : ''} ${!n.is_read ? 'bg-brand-50/30' : ''} hover:bg-paper transition-colors`}>
                    <div className={`w-9 h-9 rounded-full ${style.bg} flex items-center justify-center text-sm flex-shrink-0`}>
                      <span className={style.text}>{style.symbol}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`text-sm font-medium ${!n.is_read ? 'text-ink' : 'text-gray-600'}`}>
                          {n.title}
                        </span>
                        {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                      </div>
                      <p className="text-xs text-gray-500">{n.body}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {showMsgModal && <SendMessageModal onClose={() => setShowMsgModal(false)} onSent={handleSent} />}
      {showAnnModal && <AnnouncementModal onClose={() => setShowAnnModal(false)} onSent={handleSent} />}
    </Layout>
  )
}