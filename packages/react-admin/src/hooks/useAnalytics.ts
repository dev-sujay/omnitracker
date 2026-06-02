'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOmniTracker } from '../context/OmniTrackerProvider.js';
import {
  DashboardSummary,
  DeviceBreakdown,
  TopPage,
  FunnelStep,
  UtmBreakdown,
  DateRange,
} from '../types.js';

function toIso(d: Date) { return d.toISOString(); }

function defaultRange(): DateRange {
  return {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  };
}

// ─── useDashboardSummary ─────────────────────────────────────────────────────

export interface UseDashboardSummaryResult {
  data: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  refetch(): void;
}

export function useDashboardSummary(range?: DateRange): UseDashboardSummaryResult {
  const { fetch } = useOmniTracker();
  const r = range ?? defaultRange();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch<DashboardSummary>('/summary', { from: toIso(r.from), to: toIso(r.to) })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e: unknown) => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [r.from.getTime(), r.to.getTime(), rev]);

  return { data, loading, error, refetch: () => setRev((v) => v + 1) };
}

// ─── useDeviceBreakdown ──────────────────────────────────────────────────────

export function useDeviceBreakdown(
  type: 'device' | 'browser' | 'os' = 'device',
  range?: DateRange
): { data: DeviceBreakdown[]; loading: boolean; error: string | null } {
  const { fetch } = useOmniTracker();
  const r = range ?? defaultRange();
  const [data, setData] = useState<DeviceBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch<DeviceBreakdown[]>('/devices', { type, from: toIso(r.from), to: toIso(r.to) })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e: unknown) => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [type, r.from.getTime(), r.to.getTime()]);

  return { data, loading, error };
}

// ─── useTopPages ─────────────────────────────────────────────────────────────

export function useTopPages(
  range?: DateRange,
  limit = 20
): { data: TopPage[]; loading: boolean; error: string | null } {
  const { fetch } = useOmniTracker();
  const r = range ?? defaultRange();
  const [data, setData] = useState<TopPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch<TopPage[]>('/top-pages', { from: toIso(r.from), to: toIso(r.to), limit })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e: unknown) => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [r.from.getTime(), r.to.getTime(), limit]);

  return { data, loading, error };
}

// ─── useFunnel ───────────────────────────────────────────────────────────────

export function useFunnel(
  urls: string[],
  range?: DateRange
): { data: FunnelStep[]; loading: boolean; error: string | null } {
  const { fetch } = useOmniTracker();
  const r = range ?? defaultRange();
  const urlKey = urls.join(',');
  const [data, setData] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urls.length === 0) { setData([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch<FunnelStep[]>('/funnel', { urls: urlKey, from: toIso(r.from), to: toIso(r.to) })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e: unknown) => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [urlKey, r.from.getTime(), r.to.getTime()]);

  return { data, loading, error };
}

// ─── useUtmBreakdown ─────────────────────────────────────────────────────────

export function useUtmBreakdown(range?: DateRange): { data: UtmBreakdown[]; loading: boolean; error: string | null } {
  const { fetch } = useOmniTracker();
  const r = range ?? defaultRange();
  const [data, setData] = useState<UtmBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setNull] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch<UtmBreakdown[]>('/utm', { from: toIso(r.from), to: toIso(r.to) })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e: unknown) => { if (!cancelled) { setNull(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [r.from.getTime(), r.to.getTime()]);

  return { data, loading, error: null };
}
