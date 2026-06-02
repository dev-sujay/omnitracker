'use client';

import React from 'react';
import { useLiveVisitors } from '../hooks/useLiveVisitors.js';

export interface LiveVisitorBadgeProps {
  withinSeconds?: number;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * LiveVisitorBadge
 *
 * Displays the real-time active visitor count.
 * Connects to the SSE `/live` endpoint and updates automatically.
 *
 * @example
 * <LiveVisitorBadge />
 * <LiveVisitorBadge withinSeconds={60} /> // active in last 60s
 */
export function LiveVisitorBadge({ withinSeconds = 300, style, className }: LiveVisitorBadgeProps) {
  const { count, connected, error } = useLiveVisitors(withinSeconds);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: '#13131f',
        border: '1px solid #2e2e4e',
        borderRadius: 999,
        padding: '6px 14px',
        ...style,
      }}
      className={className}
    >
      {/* Pulse dot */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: connected ? '#10b981' : '#6b6b8a',
          boxShadow: connected ? '0 0 0 3px #10b98133' : undefined,
          animation: connected ? 'omni-pulse 2s ease-in-out infinite' : undefined,
          display: 'block',
          flexShrink: 0,
        }}
      />
      <span style={{ color: '#f8f8ff', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>
        {count.toLocaleString()}
      </span>
      <span style={{ color: '#a0a0b8', fontSize: 12 }}>
        {connected ? 'live visitors' : error ? 'reconnecting…' : 'connecting…'}
      </span>
      <style>{`
        @keyframes omni-pulse {
          0%, 100% { box-shadow: 0 0 0 2px #10b98133; }
          50% { box-shadow: 0 0 0 6px #10b98111; }
        }
      `}</style>
    </div>
  );
}
