'use client';

import React from 'react';
import { useDashboardSummary } from '../hooks/useAnalytics.js';
import { DateRange } from '../types.js';

function formatNumber(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function KpiCard({ label, value, sub, color = '#6366f1' }: KpiCardProps) {
  return (
    <div style={{
      background: '#1e1e2e',
      border: `1px solid #2e2e4e`,
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      borderLeft: `4px solid ${color}`,
      minWidth: 0,
    }}>
      <span style={{ color: '#a0a0b8', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ color: '#f8f8ff', fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>
        {value}
      </span>
      {sub && (
        <span style={{ color: '#6b6b8a', fontSize: 12 }}>{sub}</span>
      )}
    </div>
  );
}

export interface DashboardSummaryProps {
  range?: DateRange;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * DashboardSummary
 *
 * Renders 8 KPI cards (sessions, visitors, bounce rate, avg duration, etc.)
 * Fetches data from the OmniTracker admin router automatically.
 *
 * @example
 * <DashboardSummary />
 * <DashboardSummary range={{ from: startOfMonth, to: new Date() }} />
 */
export function DashboardSummary({ range, style, className }: DashboardSummaryProps) {
  const { data, loading, error } = useDashboardSummary(range);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, ...style }} className={className}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ background: '#1e1e2e', borderRadius: 12, height: 96, opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <div style={{ color: '#f87171', padding: 16 }}>Failed to load summary: {error}</div>;
  }

  const cards: KpiCardProps[] = [
    { label: 'Total Sessions', value: formatNumber(data.totalSessions), color: '#6366f1' },
    { label: 'Unique Visitors', value: formatNumber(data.uniqueVisitors), color: '#8b5cf6' },
    { label: 'New Visitors', value: formatNumber(data.newVisitors), sub: `${formatNumber(data.returningVisitors)} returning`, color: '#06b6d4' },
    { label: 'Page Views', value: formatNumber(data.totalPageViews), color: '#10b981' },
    { label: 'Total Events', value: formatNumber(data.totalEvents), color: '#f59e0b' },
    { label: 'Bounce Rate', value: `${data.bounceRate}%`, color: data.bounceRate > 70 ? '#ef4444' : '#10b981' },
    { label: 'Avg Duration', value: formatSeconds(data.avgSessionDuration), color: '#6366f1' },
    {
      label: 'New vs Returning',
      value: data.totalSessions > 0
        ? `${Math.round((data.newVisitors / data.totalSessions) * 100)}%`
        : '0%',
      sub: 'new visitor rate',
      color: '#8b5cf6',
    },
  ];

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, ...style }}
      className={className}
    >
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
