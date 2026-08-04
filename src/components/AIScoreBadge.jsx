/**
 * AIScoreBadge
 * Displays an AI lead score with colour-coded label (Hot / Warm / Cold).
 *
 * Props:
 *   score  {number}  0–100
 *   label  {string}  'Hot' | 'Warm' | 'Cold'
 */
export default function AIScoreBadge({ score, label }) {
  const styles = {
    Hot:  { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400'    },
    Warm: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400'  },
    Cold: { bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-300'   },
  }

  const s = styles[label] || styles.Cold

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {score} · {label}
    </span>
  )
}