'use client';

import React from 'react';
import { useFunnel } from '../hooks/useAnalytics.js';
import { DateRange } from '../types.js';

export interface FunnelChartProps {
  /** Ordered list of URL paths/patterns to track through the funnel */
  urls: string[];
  range?: DateRange;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * FunnelChart
 *
 * Visualizes conversion rates across a series of URL steps.
 * No external charting library required.
 *
 * @example
 * <FunnelChart urls={['/products', '/cart', '/checkout', '/order-confirmation']} />
 */
export function FunnelChart({ urls, range, style, className }: FunnelChartProps) {
  const { data, loading, error } = useFunnel(urls, range);

  return (
    <div style={{ background: '#13131f', border: '1px solid #2e2e4e', borderRadius: 12, padding: '20px 24px', ...style }} className={className}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ color: '#f8f8ff', fontWeight: 600, fontSize: 14 }}>Conversion Funnel</span>
      </div>

      {loading && (
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: urls.length }).map((_, i) => (
            <div key={i} style={{ flex: 1, background: '#1e1e2e', borderRadius: 8, height: 120, opacity: 0.5 }} />
          ))}
        </div>
      )}

      {error && <div style={{ color: '#f87171', fontSize: 13 }}>Failed to load: {error}</div>}

      {!loading && !error && data.length > 0 && (
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 140 }}>
          {data.map((step, i) => {
            const barHeight = Math.max(step.conversionRate, 4);
            const color = i === 0 ? '#6366f1' : step.dropOffRate > 50 ? '#ef4444' : '#10b981';
            return (
              <div key={step.url} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#a0a0b8', fontSize: 10, fontWeight: 600 }}>{step.conversionRate}%</span>
                <div
                  style={{
                    width: '100%',
                    height: `${barHeight}%`,
                    background: color,
                    borderRadius: '4px 4px 0 0',
                    minHeight: 8,
                    transition: 'height 0.6s ease',
                    opacity: 0.85,
                  }}
                />
                <span
                  style={{
                    color: '#6b6b8a',
                    fontSize: 9,
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    paddingTop: 4,
                  }}
                  title={step.url}
                >
                  {step.url.split('/').pop() || step.url}
                </span>
                <span style={{ color: '#a0a0b8', fontSize: 10 }}>{step.sessions.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div style={{ color: '#6b6b8a', fontSize: 13, textAlign: 'center', padding: 24 }}>
          No funnel data for the selected range.
        </div>
      )}
    </div>
  );
}
