'use client';

import React from 'react';
import { useSessionJourney, useSessionReplay } from '../hooks/useSessions.js';

export interface SessionPlayerProps {
  /** The session ID to display */
  sessionId: string | null;
  /** Base URL of the admin analytics router — used to fetch replay chunks */
  style?: React.CSSProperties;
  className?: string;
}

/**
 * SessionPlayer
 *
 * Displays the session event journey timeline and replay chunk list.
 * For actual rrweb playback, wrap the chunks list with rrweb-player in your app.
 *
 * @example
 * <SessionPlayer sessionId={selectedSessionId} />
 */
export function SessionPlayer({ sessionId, style, className }: SessionPlayerProps) {
  const { events, loading: eventsLoading } = useSessionJourney(sessionId);
  const { chunks, loading: chunksLoading } = useSessionReplay(sessionId);

  if (!sessionId) {
    return (
      <div style={{ background: '#13131f', border: '1px solid #2e2e4e', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6b6b8a', ...style }} className={className}>
        Select a session to view its journey and replay.
      </div>
    );
  }

  const loading = eventsLoading || chunksLoading;

  const eventColors: Record<string, string> = {
    PAGE_VIEW: '#6366f1',
    CLICK: '#10b981',
    PAGE_EXIT: '#ef4444',
    SCROLL: '#f59e0b',
    RAGE_CLICK: '#f97316',
    CUSTOM: '#8b5cf6',
  };

  return (
    <div style={{ background: '#13131f', border: '1px solid #2e2e4e', borderRadius: 12, overflow: 'hidden', ...style }} className={className}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #2e2e4e', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#f8f8ff', fontWeight: 600, fontSize: 14 }}>Session Journey</span>
        <code style={{ color: '#818cf8', fontSize: 11, background: '#1e1e2e', padding: '2px 8px', borderRadius: 4 }}>
          {sessionId.substring(0, 20)}…
        </code>
        {chunks.length > 0 && (
          <span style={{
            background: '#06b6d422',
            color: '#06b6d4',
            border: '1px solid #06b6d444',
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            marginLeft: 'auto',
          }}>
            🎬 {chunks.length} replay chunk{chunks.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Event timeline */}
      <div style={{ padding: '16px 20px', maxHeight: 400, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 48, background: '#1e1e2e', borderRadius: 8, opacity: 0.5 }} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div style={{ color: '#6b6b8a', textAlign: 'center', padding: 24 }}>No events found for this session.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: 15, top: 16, bottom: 0, width: 2, background: '#2e2e4e' }} />
            {events.map((event, i) => {
              const color = eventColors[event.eventType ?? ''] ?? '#6b6b8a';
              return (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' }}>
                  {/* Dot */}
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: color,
                    border: '2px solid #13131f',
                    flexShrink: 0,
                    marginTop: 4,
                    zIndex: 1,
                    boxShadow: `0 0 0 3px ${color}22`,
                  }} />
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        background: `${color}22`,
                        color,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 4,
                        letterSpacing: '0.05em',
                      }}>
                        {event.eventType ?? 'EVENT'}
                      </span>
                      <span style={{ color: '#e0e0f0', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.eventLabel ?? event.pageUrl ?? '—'}
                      </span>
                      {event.timeOnPage != null && (
                        <span style={{ color: '#6b6b8a', fontSize: 11, marginLeft: 'auto' }}>{event.timeOnPage}s</span>
                      )}
                    </div>
                    {event.pageUrl && (
                      <div style={{ color: '#4b4b6b', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.pageUrl}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Replay chunks list */}
      {chunks.length > 0 && (
        <div style={{ borderTop: '1px solid #2e2e4e', padding: '12px 20px' }}>
          <div style={{ color: '#a0a0b8', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Replay Chunks
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
            {chunks.map((chunk, i) => (
              <div key={chunk} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: '#1a1a2e', borderRadius: 6 }}>
                <span style={{ color: '#4b4b6b', fontSize: 11 }}>{i + 1}.</span>
                <code style={{ color: '#818cf8', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chunk.split('/').pop()}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
