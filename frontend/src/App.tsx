import Layout from './components/global/Layout'

export default function App() {
  return <Layout showTabs={true}>
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '2rem' }}>Grid Test</h1>
      <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>Layout components working</p>
    </div>
  </Layout>
}
