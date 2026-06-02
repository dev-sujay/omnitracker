'use client';

import React, { useState } from 'react';
import { useSessions } from '../hooks/useSessions.js';
import { SessionSummary, SessionFilters } from '../types.js';

function formatDate(str: string): string {
  return new Date(str).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 600,
    }}>{text}</span>
  );
}

export interface SessionsTableProps {
  /** Initial filters */
  filters?: SessionFilters;
  /** Called when a row is clicked — use to open a session detail / replay view */
  onSessionClick?: (session: SessionSummary) => void;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * SessionsTable
 *
 * Paginated, filterable table of user sessions.
 * Clicking a row fires `onSessionClick` so you can open SessionPlayer.
 *
 * @example
 * <SessionsTable onSessionClick={(s) => setSelectedSession(s.session_id)} />
 */
export function SessionsTable({ filters: initialFilters = {}, onSessionClick, style, className }: SessionsTableProps) {
  const [filters, setFilters] = useState<SessionFilters>({ page: 1, limit: 25, ...initialFilters });
  const { sessions, total, loading, error, refetch } = useSessions(filters);

  const totalPages = Math.ceil(total / (filters.limit ?? 25));

  const th: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    color: '#a0a0b8',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #2e2e4e',
    whiteSpace: 'nowrap',
  };

  const td: React.CSSProperties = {
    padding: '12px 14px',
    color: '#e0e0f0',
    fontSize: 13,
    borderBottom: '1px solid #1e1e2e',
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ background: '#13131f', border: '1px solid #2e2e4e', borderRadius: 12, overflow: 'hidden', ...style }} className={className}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #2e2e4e', flexWrap: 'wrap' }}>
        <span style={{ color: '#f8f8ff', fontWeight: 600, fontSize: 14 }}>Sessions</span>
        <span style={{ color: '#6b6b8a', fontSize: 12 }}>{total.toLocaleString()} total</span>
        <div style={{ flex: 1 }} />
        <select
          value={filters.visitorType ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, visitorType: (e.target.value as 'new' | 'returning') || undefined, page: 1 }))}
          style={{ background: '#1e1e2e', color: '#e0e0f0', border: '1px solid #2e2e4e', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
        >
          <option value=''>All visitors</option>
          <option value='new'>New</option>
          <option value='returning'>Returning</option>
        </select>
        <select
          value={filters.hasRecording === true ? 'true' : filters.hasRecording === false ? 'false' : ''}
          onChange={(e) => setFilters((f) => ({ ...f, hasRecording: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined, page: 1 }))}
          style={{ background: '#1e1e2e', color: '#e0e0f0', border: '1px solid #2e2e4e', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
        >
          <option value=''>All recordings</option>
          <option value='true'>Has recording</option>
          <option value='false'>No recording</option>
        </select>
        <button onClick={refetch} style={{ background: '#2e2e4e', color: '#e0e0f0', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      {error && <div style={{ padding: 16, color: '#f87171' }}>Error: {error}</div>}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={th}>Session ID</th>
              <th style={th}>Last Active</th>
              <th style={th}>Device</th>
              <th style={th}>Country</th>
              <th style={th}>Visitor</th>
              <th style={th}>Events</th>
              <th style={th}>Recording</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} style={td}>
                      <div style={{ height: 14, background: '#2e2e4e', borderRadius: 4, opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              sessions.map((s) => (
                <tr
                  key={s.session_id}
                  onClick={() => onSessionClick?.(s)}
                  style={{ cursor: onSessionClick ? 'pointer' : 'default', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#1e1e2e'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                >
                  <td style={{ ...td, color: '#818cf8', fontFamily: 'monospace', fontSize: 12 }}>
                    {s.session_id.substring(0, 16)}…
                  </td>
                  <td style={td}>{formatDate(s.last_activity)}</td>
                  <td style={td}>
                    <span style={{ color: '#a0a0b8' }}>{s.device_type ?? '—'}</span>
                    {s.browser ? ` / ${s.browser}` : ''}
                  </td>
                  <td style={td}>{s.country ?? '—'}</td>
                  <td style={td}>
                    {s.is_new_visitor ? (
                      <Badge
                        text={s.is_new_visitor === 'new' ? 'New' : 'Returning'}
                        color={s.is_new_visitor === 'new' ? '#10b981' : '#6366f1'}
                      />
                    ) : '—'}
                  </td>
                  <td style={td}>{s.event_count}</td>
                  <td style={td}>
                    {s.recording_key ? <Badge text='🎬 Available' color='#06b6d4' /> : <span style={{ color: '#4b4b6b' }}>None</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid #2e2e4e' }}>
          <button
            disabled={filters.page === 1}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
            style={{ background: '#1e1e2e', color: filters.page === 1 ? '#4b4b6b' : '#e0e0f0', border: '1px solid #2e2e4e', borderRadius: 6, padding: '4px 10px', cursor: filters.page === 1 ? 'not-allowed' : 'pointer', fontSize: 12 }}
          >← Prev</button>
          <span style={{ color: '#6b6b8a', fontSize: 12 }}>Page {filters.page ?? 1} of {totalPages}</span>
          <button
            disabled={filters.page === totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
            style={{ background: '#1e1e2e', color: filters.page === totalPages ? '#4b4b6b' : '#e0e0f0', border: '1px solid #2e2e4e', borderRadius: 6, padding: '4px 10px', cursor: filters.page === totalPages ? 'not-allowed' : 'pointer', fontSize: 12 }}
          >Next →</button>
        </div>
      )}
    </div>
  );
}
