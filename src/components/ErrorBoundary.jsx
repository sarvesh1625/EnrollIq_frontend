import { Component } from 'react'

// Shows what went wrong instead of a blank white page.
export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Screen crashed:', error, info?.componentStack) }

  signOut = () => {
    try { localStorage.removeItem('token'); localStorage.removeItem('user') } catch {}
    window.location.href = '/login'
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f6f1', padding:24, fontFamily:'system-ui, sans-serif' }}>
        <div style={{ maxWidth:520, background:'white', borderRadius:16, padding:28, boxShadow:'0 8px 30px rgba(0,0,0,0.08)' }}>
          <h1 style={{ margin:'0 0 8px', fontSize:20 }}>Something went wrong on this screen</h1>
          <p style={{ margin:'0 0 14px', color:'#6b7280', fontSize:14 }}>Please send this message to support:</p>
          <pre style={{ background:'#f3f4f6', padding:12, borderRadius:8, fontSize:12, whiteSpace:'pre-wrap', margin:'0 0 16px' }}>{String(this.state.error?.message || this.state.error)}</pre>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => window.location.reload()} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #e5e7eb', background:'white', cursor:'pointer' }}>Reload</button>
            <button onClick={this.signOut} style={{ padding:'8px 14px', borderRadius:8, border:'none', background:'#1a1814', color:'white', cursor:'pointer' }}>Sign out</button>
          </div>
        </div>
      </div>
    )
  }
}