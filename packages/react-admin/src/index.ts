// ─── Provider ─────────────────────────────────────────────────────────────────
export { OmniTrackerProvider, useOmniTracker } from './context/OmniTrackerProvider.js';
export type { OmniTrackerProviderProps } from './context/OmniTrackerProvider.js';

// ─── Hooks ────────────────────────────────────────────────────────────────────
export {
  useDashboardSummary,
  useDeviceBreakdown,
  useTopPages,
  useFunnel,
  useUtmBreakdown,
} from './hooks/useAnalytics.js';
export type { UseDashboardSummaryResult } from './hooks/useAnalytics.js';

export { useSessions, useSessionJourney, useSessionReplay } from './hooks/useSessions.js';
export type { UseSessionsResult } from './hooks/useSessions.js';

export { useLiveVisitors } from './hooks/useLiveVisitors.js';
export type { UseLiveVisitorsResult, LiveVisitorData } from './hooks/useLiveVisitors.js';

// ─── Components ───────────────────────────────────────────────────────────────
export { DashboardSummary } from './components/DashboardSummary.js';
export type { DashboardSummaryProps } from './components/DashboardSummary.js';

export { SessionsTable } from './components/SessionsTable.js';
export type { SessionsTableProps } from './components/SessionsTable.js';

export { SessionPlayer } from './components/SessionPlayer.js';
export type { SessionPlayerProps } from './components/SessionPlayer.js';

export { DeviceChart } from './components/DeviceChart.js';
export type { DeviceChartProps } from './components/DeviceChart.js';

export { TopPagesTable } from './components/TopPagesTable.js';
export type { TopPagesTableProps } from './components/TopPagesTable.js';

export { FunnelChart } from './components/FunnelChart.js';
export type { FunnelChartProps } from './components/FunnelChart.js';

export { LiveVisitorBadge } from './components/LiveVisitorBadge.js';
export type { LiveVisitorBadgeProps } from './components/LiveVisitorBadge.js';

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  DashboardSummary as DashboardSummaryData,
  DeviceBreakdown,
  TopPage,
  FunnelStep,
  UtmBreakdown,
  SessionSummary,
  SiteVisitEvent,
  DateRange,
  SessionFilters,
  OmniTrackerContextValue,
} from './types.js';
