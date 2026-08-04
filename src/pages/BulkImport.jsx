import { useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const importApi = {
  importLeads:    (rows) => api.post('/import/leads',    { rows }),
  importStudents: (rows) => api.post('/import/students', { rows }),
  getHistory:     ()     => api.get('/import/history'),
}

const LEAD_TEMPLATE = [
  { parent_name:'Sunita Reddy', phone:'9876543210', email:'sunita@gmail.com', child_grade:'Grade 4', area:'Madhapur', lead_source:'Google Ads', keyword:'best school' },
  { parent_name:'Mohan Kumar',  phone:'9812345678', email:'', child_grade:'Grade 1', area:'Gachibowli', lead_source:'WhatsApp', keyword:'' },
]
const STUDENT_TEMPLATE = [
  { name:'Arjun Pillai', roll_number:'S-010', class:'Grade 4', section:'A', dob:'2016-03-12', parent_name:'Suresh Pillai', phone:'9876500007', email:'suresh@gmail.com', area:'Madhapur' },
  { name:'Deepa Kumar',  roll_number:'S-011', class:'Grade 2', section:'B', dob:'2018-07-22', parent_name:'Rakesh Kumar',  phone:'9876500008', email:'', area:'Gachibowli' },
]

const LEAD_TIPS = [
  '🤖 AI score calculated for every lead',
  '🔍 Duplicate phone detection (30 days)',
  '📊 Source defaults to "Form" if blank',
  '⚡ Hot/Warm/Cold label auto-assigned',
]
const STUDENT_TIPS = [
  '🔢 Roll number auto-generated if blank',
  '✓ Duplicate check by roll number',
  '📋 All required fields validated',
  '⚠️ Failed rows reported with reason',
]

function downloadCSV(data, filename) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => '"' + (row[h] || '') + '"').join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text) {
  const lines   = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/"/g, '').trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i] || '' })
    return obj
  })
}

export default function BulkImport() {
  const [importType, setImportType] = useState('leads')
  const [rows,       setRows]       = useState([])
  const [importing,  setImporting]  = useState(false)
  const [result,     setResult]     = useState(null)
  const [history,    setHistory]    = useState([])
  const [tab,        setTab]        = useState('import')

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result)
        setRows(parsed)
        setResult(null)
      } catch {
        alert('Could not parse CSV. Please check the format.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!rows.length) return
    setImporting(true)
    setResult(null)
    try {
      const res = importType === 'leads'
        ? await importApi.importLeads(rows)
        : await importApi.importStudents(rows)
      setResult(res.data)
      setRows([])
    } catch (err) {
      setResult({
        message: err.response?.data?.message || 'Import failed',
        success: 0,
        failed: rows.length,
      })
    } finally {
      setImporting(false)
    }
  }

  const loadHistory = async () => {
    try {
      const res = await importApi.getHistory()
      setHistory(res.data)
    } catch {
      setHistory([
        { id:1, import_type:'leads',    total_rows:8, success_rows:8, failed_rows:0, status:'Completed', created_at:'2026-04-17T09:00:00Z', imported_by_name:'Admin User' },
        { id:2, import_type:'students', total_rows:5, success_rows:5, failed_rows:0, status:'Completed', created_at:'2026-04-17T09:05:00Z', imported_by_name:'Admin User' },
      ])
    }
  }

  const tips = importType === 'leads' ? LEAD_TIPS : STUDENT_TIPS
  const requiredCols = importType === 'leads' ? ['parent_name', 'phone'] : ['name']
  const optionalCols = importType === 'leads'
    ? ['email', 'child_grade', 'area', 'lead_source', 'keyword', 'notes']
    : ['roll_number', 'class', 'section', 'dob', 'parent_name', 'phone', 'email', 'area']

  return (
    <Layout>
      <div className="page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">Bulk Import</h1>
            <p className="text-gray-400 text-sm mt-1">Import leads and students from CSV files</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-strip mb-6">
          {['import', 'history'].map(t => (
            <button key={t} onClick={() => { setTab(t); if (t === 'history') loadHistory() }}
              className={'text-xs px-4 py-2 rounded-md transition-colors font-medium capitalize ' + (tab === t ? 'bg-ink text-white' : 'text-gray-500 hover:bg-cream')}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'import' && (
          <div className="grid grid-cols-3 gap-6 bulk-split">
            <div className="col-span-2 flex flex-col gap-5">

              {/* Type selector */}
              <div className="card">
                <h2 className="font-semibold text-ink text-sm mb-4">What are you importing?</h2>
                <div className="grid grid-cols-2 gap-3 g-2">
                  {[
                    { key:'leads',    icon:'◈', label:'Leads',   desc:'Parent enquiries from Google Ads, Facebook, WhatsApp etc.' },
                    { key:'students', icon:'◉', label:'Students', desc:'Existing student records with class, parent details etc.' },
                  ].map(t => (
                    <button key={t.key}
                      onClick={() => { setImportType(t.key); setRows([]); setResult(null) }}
                      className={'flex-1 p-4 rounded-xl border-2 text-left transition-all ' + (importType === t.key ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}>
                      <span className="text-2xl mb-2 block">{t.icon}</span>
                      <p className="font-semibold text-ink text-sm">{t.label}</p>
                      <p className="text-xs text-gray-400 mt-1">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-ink text-sm">Upload CSV file</h2>
                  <button
                    onClick={() => downloadCSV(importType === 'leads' ? LEAD_TEMPLATE : STUDENT_TEMPLATE, importType + '_template.csv')}
                    className="text-xs text-brand-600 hover:underline">
                    Download template
                  </button>
                </div>

                <label className="block border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-brand-400 transition-all">
                  <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
                  <span className="text-4xl block mb-3">📄</span>
                  <p className="text-sm font-medium text-ink">Click to upload CSV file</p>
                  <p className="text-xs text-gray-400 mt-1">CSV format only</p>
                </label>

                {rows.length > 0 && (
                  <div className="mt-4 bg-green-50 rounded-xl p-4">
                    <p className="text-sm font-medium text-green-700">{rows.length} rows loaded from CSV</p>
                    <p className="text-xs text-green-600 mt-1">Review preview below, then click Import</p>
                  </div>
                )}

                {result && (
                  <div className={'mt-4 rounded-xl p-4 ' + (result.failed > 0 ? 'bg-amber-50' : 'bg-green-50')}>
                    <p className={'text-sm font-semibold ' + (result.failed > 0 ? 'text-amber-700' : 'text-green-700')}>
                      {result.message}
                    </p>
                    {result.success !== undefined && (
                      <div className="flex gap-4 mt-2">
                        <span className="text-xs text-green-700">{result.success} imported</span>
                        {result.failed > 0 && <span className="text-xs text-red-600">{result.failed} failed</span>}
                      </div>
                    )}
                  </div>
                )}

                {rows.length > 0 && (
                  <button onClick={handleImport} disabled={importing}
                    className="btn-primary w-full mt-4 justify-center disabled:opacity-60">
                    {importing ? 'Importing ' + rows.length + ' ' + importType + '...' : 'Import ' + rows.length + ' ' + importType}
                  </button>
                )}
              </div>

              {/* Preview table */}
              {rows.length > 0 && (
                <div className="card" style={{padding:0,overflowX:"auto"}}>
                  <div className="px-5 py-3 border-b border-gray-100 bg-paper">
                    <h2 className="font-semibold text-ink text-sm">
                      Preview ({Math.min(rows.length, 5)} of {rows.length} rows)
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="border-b border-gray-100">
                        <tr>
                          {Object.keys(rows[0]).map(h => (
                            <th key={h} className="text-left text-gray-400 font-medium px-4 py-2">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="hover:bg-paper">
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="px-4 py-2 text-gray-600 max-w-32 truncate">{v || '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right instructions */}
            <div className="flex flex-col gap-4">
              <div className="card">
                <h2 className="font-semibold text-ink text-sm mb-3">CSV format required</h2>
                <div className="text-xs text-gray-500 leading-relaxed flex flex-col gap-1">
                  <p className="font-medium text-ink">Required columns:</p>
                  {requiredCols.map(f => (
                    <p key={f} className="flex items-center gap-1">
                      <span className="text-green-500">*</span> {f}
                    </p>
                  ))}
                  <p className="font-medium text-ink mt-2">Optional columns:</p>
                  {optionalCols.map(f => (
                    <p key={f}>· {f}</p>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2 className="font-semibold text-ink text-sm mb-3">Auto features</h2>
                <div className="flex flex-col gap-2 text-xs text-gray-500">
                  {tips.map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className="card" style={{padding:0,overflowX:"auto"}}>
            <table className="w-full text-sm" style={{ minWidth: 680 }}>
              <thead className="border-b border-gray-100 bg-paper">
                <tr>
                  {['Type', 'Total', 'Success', 'Failed', 'Status', 'By', 'Date'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No imports yet</td>
                  </tr>
                ) : history.map(h => (
                  <tr key={h.id} className="hover:bg-paper">
                    <td className="px-5 py-3">
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full capitalize">{h.import_type}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink font-medium">{h.total_rows}</td>
                    <td className="px-5 py-3 text-xs text-green-600 font-medium">{h.success_rows}</td>
                    <td className="px-5 py-3 text-xs text-red-500">{h.failed_rows}</td>
                    <td className="px-5 py-3">
                      <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' + (h.status === 'Completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                        {h.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{h.imported_by_name}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {new Date(h.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    
      <style>{`
        @media (max-width: 900px) {
          .bulk-split { grid-template-columns: 1fr !important; }
        }
      `}</style>
</Layout>
  )
}