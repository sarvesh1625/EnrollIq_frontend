import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

/* Bulk import now lives in the Super Admin dashboard (Data tools). This page only explains that,
   so old bookmarks to /import don't show an error. */
export default function BulkImport() {
  return (
    <Layout title="Bulk Import">
      <div className="card" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
        <h2 className="font-serif text-xl font-bold text-ink" style={{ marginBottom: 8 }}>Import &amp; export are managed by EnrollIQ</h2>
        <p className="text-sm text-gray-500" style={{ marginBottom: 16 }}>
          To bring in student or lead data, or to get a copy of your records, please contact EnrollIQ support — the platform
          team does this for you.
        </p>
        <Link to="/support" className="btn-primary" style={{ display: 'inline-flex' }}>Contact support</Link>
      </div>
    </Layout>
  )
}