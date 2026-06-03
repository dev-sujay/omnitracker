'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOmniTracker } from '../context/OmniTrackerProvider.js';
import { SessionSummary, SiteVisitEvent, SessionFilters } from '../types.js';

// ─── useSessions ─────────────────────────────────────────────────────────────

export interface UseSessionsResult {
  sessions: SessionSummary[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch(): void;
  counts?: Record<string, number | null | undefined>;
}

export function useSessions(filters: SessionFilters = {}): UseSessionsResult {
  const { fetch } = useOmniTracker();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number | null | undefined> | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  const params: Record<string, string | number | boolean | undefined> = {
    from: filters.from?.toISOString(),
    to: filters.to?.toISOString(),
    country: filters.country,
    device: filters.device,
    browser: filters.browser,
    customerId: filters.customerId,
    visitorType: filters.visitorType,
    hasRecording: filters.hasRecording,
    page: filters.page ?? 1,
    limit: filters.limit ?? 25,
    searchTerm: filters.searchTerm,
    isConverted: filters.isConverted,
    isLoggedIn: filters.isLoggedIn,
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch<{
      sessions?: SessionSummary[];
      total?: number;
      result?: SessionSummary[];
      total_count?: number;
      counts?: Record<string, number | null | undefined>;
    }>('/sessions', params)
      .then((res) => {
        if (cancelled) return;
        const s = res.sessions ?? res.result ?? [];
        const t = res.total ?? res.total_count ?? s.length;
        setSessions(s);
        setTotal(t);
        setCounts(res.counts);
        setLoading(false);
      })
      .catch((e: unknown) => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [
    filters.from?.getTime(),
    filters.to?.getTime(),
    filters.country,
    filters.device,
    filters.browser,
    filters.customerId,
    filters.visitorType,
    filters.hasRecording,
    filters.page,
    filters.limit,
    filters.searchTerm,
    filters.isConverted,
    filters.isLoggedIn,
    rev,
  ]);

  return { sessions, total, loading, error, refetch: () => setRev((v) => v + 1), counts };
}

// ─── useSessionJourney ────────────────────────────────────────────────────────

export function useSessionJourney(
  sessionId: string | null
): { events: SiteVisitEvent[]; loading: boolean; error: string | null } {
  const { fetch } = useOmniTracker();
  const [events, setEvents] = useState<SiteVisitEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) { setEvents([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch<SiteVisitEvent[]>(`/sessions/${sessionId}/journey`)
      .then((e) => { if (!cancelled) { setEvents(e); setLoading(false); } })
      .catch((e: unknown) => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [sessionId]);

  return { events, loading, error };
}

// ─── useSessionReplay ─────────────────────────────────────────────────────────

export function useSessionReplay(
  sessionId: string | null
): { chunks: string[]; loading: boolean; error: string | null } {
  const { fetch } = useOmniTracker();
  const [chunks, setChunks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) { setChunks([]); return; }
    let cancelled = false;
    setLoading(true);
    fetch<{ sessionId: string; chunks: string[] }>(`/sessions/${sessionId}/replay`)
      .then(({ chunks: c }) => { if (!cancelled) { setChunks(c); setLoading(false); } })
      .catch((e: unknown) => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [sessionId]);

  return { chunks, loading, error };
}
