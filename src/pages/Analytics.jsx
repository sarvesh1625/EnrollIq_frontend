import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getAnalyticsOverview } from '../api/analytics'

const MOCK = {
  kpis: { total_leads: 284, admissions: 52, conversion_rate: 18, revenue_driven: 7800000 },
  monthly: [
    { month:'Nov', leads:120, admissions:18 },
    { month:'Dec', leads:145, admissions:22 },
    { month:'Jan', leads:190, admissions:31 },
    { month:'Feb', leads:230, admissions:40 },
    { month:'Mar', leads:270, admissions:48 },
    { month:'Apr', leads:284, admissions:52 },
  ],
  sources: [
    { label:'Google Ads', count:142, pct:50 },
    { label:'WhatsApp',   count:71,  pct:25 },
    { label:'Form',       count:57,  pct:20 },
    { label:'Facebook',   count:14,  pct:5  },
  ],
  keywords: [
    { keyword:'best school in madhapur',  leads:68, conv:'22%' },
    { keyword:'cbse schools near me',     leads:45, conv:'18%' },
    { keyword:'top school hyderabad',     leads:38, conv:'15%' },
    { keyword:'international school hyd', leads:22, conv:'27%' },
    { keyword:'school admission 2026',    leads:18, conv:'11%' },
  ],
  fee_trend: [
    { month:'Nov', collected:480000   },
    { month:'Dec', collected:610000   },
    { month:'Jan', collected:720000   },
    { month:'Feb', collected:890000   },
    { month:'Mar', collected:1050000  },
    { month:'Apr', collected:1240000  },
  ],
}

const SOURCE_COLORS = ['bg-brand-500','bg-amber-400','bg-blue-400','bg-purple-400','bg-green-400','bg-gray-400']

function fmt(n) {
  if (!n) return '₹0'
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`
  return `₹${(n/1000).toFixed(0)}K`
}

function BarChart({ data, barKey, secondKey, height = 140, color = 'bg-brand-600', secondColor = 'bg-brand-200' }) {
  const max = Math.max(...data.map(d => d[barKey]))
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map(d => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex gap-0.5 items-end" style={{ height: height - 24 }}>
            <div className={`flex-1 ${secondKey ? secondColor : color} rounded-t-sm`}
              style={{ height: `${(d[barKey] / max) * 100}%` }} />
            {secondKey && (
              <div className={`flex-1 ${color} rounded-t-sm`}
                style={{ height: `${((d[secondKey]||0) / max) * 100}%` }} />
            )}
          </div>
          <span className="text-xs text-gray-400">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [data, setData]     = useState(MOCK)
  const [period, setPeriod] = useState('6m')

  useEffect(() => {
    getAnalyticsOverview()
      .then(res => setData(res.data))
      .catch(() => {})
  }, [])

  const { kpis, monthly, sources, keywords, fee_trend } = data

  return (
    <Layout>
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">Analytics</h1>
            <p className="text-gray-400 text-sm mt-1">Performance overview</p>
          </div>
          <div className="actions"><div className="tabs-strip">
            {['1m','3m','6m','1y'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                  period === p ? 'bg-ink text-white font-medium' : 'text-gray-500 hover:bg-cream'
                }`}>{p}</button>
            ))}
          </div></div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8 g-4">
          {[
            { label:'Total leads',       value: kpis.total_leads.toLocaleString(), accent:true, delta:'+18% vs last month' },
            { label:'Admissions',        value: kpis.admissions,       sub:`${kpis.conversion_rate}% conversion` },
            { label:'Revenue driven',    value: fmt(kpis.revenue_driven), delta:'+₹1.2L this month' },
            { label:'Cost per lead',     value: '₹420',                sub:'Google Ads avg' },
          ].map(k => (
            <div key={k.label} className="stat-card">
              <p className="label">{k.label}</p>
              <p className={`font-serif text-3xl font-bold mt-1 ${k.accent ? 'text-brand-600' : 'text-ink'}`}>{k.value}</p>
              {k.sub   && <p className="text-xs text-gray-400 mt-1">{k.sub}</p>}
              {k.delta && <p className="text-xs text-green-600 mt-1">{k.delta}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6 analytics-split">
          <div className="card analytics-main">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-ink text-sm">Leads vs admissions (monthly)</h2>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-brand-200"/><span className="text-gray-500">Leads</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-brand-600"/><span className="text-gray-500">Admissions</span></div>
              </div>
            </div>
            <BarChart data={monthly} barKey="leads" secondKey="admissions" height={160} />
          </div>

          <div className="card">
            <h2 className="font-semibold text-ink text-sm mb-5">Lead sources</h2>
            <div className="flex flex-col gap-3.5">
              {sources.map((s, i) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-sm ${SOURCE_COLORS[i]}`} />
                      <span className="text-xs text-gray-600">{s.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-ink">{s.count} <span className="font-normal text-gray-400">({s.pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${SOURCE_COLORS[i]} rounded-full`} style={{ width:`${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-ink text-sm">Fee collection trend</h2>
            <span className="text-xs text-green-600 font-medium">
              ↑ {Math.round(((fee_trend.at(-1)?.collected - fee_trend[0]?.collected) / fee_trend[0]?.collected) * 100)}% growth
            </span>
          </div>
          <BarChart data={fee_trend.map(f => ({ month:f.month, amount:f.collected }))} barKey="amount" height={110} color="bg-green-500" />
          <div className="flex mt-3 pt-3 border-t border-gray-100">
            {fee_trend.map(f => (
              <div key={f.month} className="flex-1 text-center">
                <p className="text-xs font-medium text-ink">{fmt(f.collected)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ overflowX:"auto" }}>
          <h2 className="font-semibold text-ink text-sm mb-5">Top converting keywords</h2>
          <table className="w-full" style={{ minWidth:420 }}>
            <thead>
              <tr className="border-b border-gray-100">
                {['Keyword','Leads','Conversion','Volume'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {keywords.map((k, i) => (
                <tr key={k.keyword}>
                  <td className="py-3 flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{i+1}</span>
                    <span className="text-xs font-medium text-ink">{k.keyword}</span>
                  </td>
                  <td className="py-3 text-xs text-gray-500">{k.leads}</td>
                  <td className="py-3">
                    <span className={`text-xs font-semibold ${parseInt(k.conv)>=20?'text-green-600':parseInt(k.conv)>=15?'text-amber-600':'text-gray-500'}`}>
                      {k.conv}
                    </span>
                  </td>
                  <td className="py-3 w-32">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-400 rounded-full" style={{ width:`${(k.leads/keywords[0].leads)*100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    
      <style>{`
        @media (max-width: 900px) {
          .analytics-split { grid-template-columns: 1fr !important; }
        }
      `}</style>
</Layout>
  )
}