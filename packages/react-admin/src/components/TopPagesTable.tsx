'use client';

import React from 'react';
import { useTopPages } from '../hooks/useAnalytics.js';
import { DateRange } from '../types.js';

export interface TopPagesTableProps {
  limit?: number;
  range?: DateRange;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * TopPagesTable
 *
 * Table of top N pages by view count, sorted by views descending.
 *
 * @example
 * <TopPagesTable limit={10} />
 */
export function TopPagesTable({ limit = 10, range, style, className }: TopPagesTableProps) {
  const { data, loading, error } = useTopPages(range, limit);

  function formatMs(s: number): string {
    if (!s) return '—';
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  const th: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    color: '#a0a0b8',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #2e2e4e',
  };

  const td: React.CSSProperties = {
    padding: '11px 14px',
    color: '#e0e0f0',
    fontSize: 13,
    borderBottom: '1px solid #1a1a2e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ background: '#13131f', border: '1px solid #2e2e4e', borderRadius: 12, overflow: 'hidden', ...style }} className={className}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #2e2e4e' }}>
        <span style={{ color: '#f8f8ff', fontWeight: 600, fontSize: 14 }}>Top Pages</span>
      </div>

      {error && <div style={{ padding: 16, color: '#f87171' }}>Error: {error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '50%' }}>Page URL</th>
              <th style={th}>Views</th>
              <th style={th}>Sessions</th>
              <th style={th}>Avg Time</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: limit }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} style={td}>
                      <div style={{ height: 14, background: '#2e2e4e', borderRadius: 4, opacity: 0.5 }} />
                    </td>
                  ))}
                </tr>
              ))
              : data.map((page, i) => (
                <tr key={page.pageUrl}>
                  <td style={{ ...td, color: '#818cf8' }} title={page.pageUrl}>
                    <span style={{ color: '#4b4b6b', marginRight: 8, fontSize: 11 }}>{i + 1}.</span>
                    {page.pageUrl}
                  </td>
                  <td style={td}>{page.views.toLocaleString()}</td>
                  <td style={td}>{page.uniqueSessions.toLocaleString()}</td>
                  <td style={td}>{formatMs(page.avgTimeOnPage)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
