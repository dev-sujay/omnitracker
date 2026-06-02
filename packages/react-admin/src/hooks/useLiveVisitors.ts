'use client';

import { useState, useEffect, useRef } from 'react';
import { useOmniTracker } from '../context/OmniTrackerProvider.js';

export interface LiveVisitorData {
  count: number;
  timestamp: string;
}

export interface UseLiveVisitorsResult {
  count: number;
  timestamp: string | null;
  connected: boolean;
  error: string | null;
}

/**
 * useLiveVisitors
 *
 * Connects to the SSE `/live` endpoint and streams the active visitor count.
 * Automatically reconnects on disconnect.
 *
 * @param withinSeconds How far back (in seconds) to count active visitors. Default: 300 (5 min)
 */
export function useLiveVisitors(withinSeconds = 300): UseLiveVisitorsResult {
  const { baseUrl, getAuthToken } = useOmniTracker();
  const [count, setCount] = useState(0);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;

      // EventSource doesn't support custom headers — pass token as query param
      const token = getAuthToken?.();
      const url = `${baseUrl}/live?withinSeconds=${withinSeconds}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        if (!destroyed) { setConnected(true); setError(null); }
      };

      es.onmessage = (event: MessageEvent) => {
        if (destroyed) return;
        try {
          const data = JSON.parse(event.data as string) as LiveVisitorData;
          setCount(data.count);
          setTimestamp(data.timestamp);
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        if (!destroyed) {
          setConnected(false);
          setError('Connection lost — reconnecting...');
          es.close();
          // Reconnect after 5 seconds
          setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      destroyed = true;
      esRef.current?.close();
      setConnected(false);
    };
  }, [baseUrl, withinSeconds]);

  return { count, timestamp, connected, error };
}
