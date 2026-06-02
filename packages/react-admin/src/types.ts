// ─── All types that consumers need ───────────────────────────────────────────

export interface DashboardSummary {
  totalSessions: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  totalPageViews: number;
  totalEvents: number;
}

export interface DeviceBreakdown {
  dimension: string;
  count: number;
  percentage: number;
}

export interface TopPage {
  pageUrl: string;
  views: number;
  uniqueSessions: number;
  avgTimeOnPage: number;
}

export interface FunnelStep {
  url: string;
  sessions: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface UtmBreakdown {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  sessions: number;
  newVisitors: number;
}

export interface SessionSummary {
  session_id: string;
  visitor_id?: string | null;
  customer_id?: string | null;
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
  is_new_visitor?: 'new' | 'returning' | null;
  start_time: string;
  last_activity: string;
  event_count: number;
  max_scroll_depth?: number | null;
  avg_time_on_page?: number | null;
  recording_key?: string | null;
}

export interface SiteVisitEvent {
  sessionId: string;
  eventType?: string | null;
  eventLabel?: string | null;
  pageUrl?: string | null;
  timeOnPage?: number | null;
  scrollDepth?: number | null;
  metadata?: string | null;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface SessionFilters {
  from?: Date;
  to?: Date;
  country?: string;
  device?: string;
  browser?: string;
  customerId?: string;
  visitorType?: 'new' | 'returning';
  hasRecording?: boolean;
  page?: number;
  limit?: number;
}

export interface OmniTrackerContextValue {
  baseUrl: string;
  getAuthToken?: () => string | null | undefined;
  fetch<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
}
