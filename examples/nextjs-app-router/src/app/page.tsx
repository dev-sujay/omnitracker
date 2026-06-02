import React from 'react';
import Link from 'next/link';

export default function Page() {
  return (
    <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 20px' }}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '30px' }}>
        <h1 style={{ color: '#38bdf8', marginTop: 0 }}>Next.js App Router Integration</h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>
          This page is running inside Next.js 14 App Router. Navigating between page links below triggers client-side page views automatically by hooking into pathname state transitions.
        </p>

        <div style={{ display: 'flex', gap: '15px', margin: '25px 0' }}>
          <Link href="/" style={{ color: '#38bdf8', textDecoration: 'underline' }}>
            Home Page
          </Link>
          <Link href="/?page=test-params" style={{ color: '#38bdf8', textDecoration: 'underline' }}>
            Test Search Params
          </Link>
        </div>

        <div style={{ marginTop: '30px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#f1f5f9' }}>Testing Interactive Elements</h2>
          <button
            id="nextjs-click-btn"
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Click Me (Next.js Tracked Click)
          </button>
        </div>
      </div>
    </div>
  );
}
