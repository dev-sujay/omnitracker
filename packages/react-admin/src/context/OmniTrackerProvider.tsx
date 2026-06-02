'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { OmniTrackerContextValue } from '../types.js';

const OmniTrackerContext = createContext<OmniTrackerContextValue | null>(null);

export interface OmniTrackerProviderProps {
  /** Base URL of the admin analytics router (e.g. '/admin/analytics') */
  baseUrl: string;
  /**
   * Optional function to get the auth token for API requests.
   * If provided, it will be sent as `Authorization: Bearer <token>`.
   */
  getAuthToken?: () => string | null | undefined;
  children: ReactNode;
}

/**
 * OmniTrackerProvider
 *
 * Wraps your admin dashboard and provides the API fetch context.
 * All OmniTracker hooks and components must be inside this provider.
 *
 * @example
 * <OmniTrackerProvider baseUrl="/admin/analytics" getAuthToken={() => myToken}>
 *   <DashboardSummary />
 *   <SessionsTable />
 * </OmniTrackerProvider>
 */
export function OmniTrackerProvider({ baseUrl, getAuthToken, children }: OmniTrackerProviderProps) {
  const normalizedBase = baseUrl.replace(/\/$/, '');

  const apiFetch = useCallback(
    async <T,>(
      path: string,
      params?: Record<string, string | number | boolean | undefined>
    ): Promise<T> => {
      const url = new URL(
        `${normalizedBase}${path.startsWith('/') ? path : `/${path}`}`,
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
      );

      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            url.searchParams.set(k, String(v));
          }
        });
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = getAuthToken?.();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await globalThis.fetch(url.toString(), { headers });
      if (!res.ok) {
        throw new Error(`[OmniTracker] ${res.status} ${res.statusText}: ${path}`);
      }
      const json = await res.json() as { success: boolean; data: T };
      return json.data;
    },
    [normalizedBase, getAuthToken]
  );

  const value: OmniTrackerContextValue = { baseUrl: normalizedBase, getAuthToken, fetch: apiFetch };

  return (
    <OmniTrackerContext.Provider value={value}>
      {children}
    </OmniTrackerContext.Provider>
  );
}

export function useOmniTracker(): OmniTrackerContextValue {
  const ctx = useContext(OmniTrackerContext);
  if (!ctx) {
    throw new Error('[OmniTracker] useOmniTracker must be used inside <OmniTrackerProvider>');
  }
  return ctx;
}
