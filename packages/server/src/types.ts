// ─── EVENT TYPES ─────────────────────────────────────────────────────────────

export type EventType = 'PAGE_VIEW' | 'CLICK' | 'PAGE_EXIT' | 'SCROLL' | 'RAGE_CLICK' | 'CUSTOM';
export type VisitorType = 'new' | 'returning';

// ─── WRITE PAYLOADS ──────────────────────────────────────────────────────────

export interface SiteVisitPayload {
  sessionId: string;
  visitorId?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  ipAddress?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  eventType?: EventType | null;
  eventLabel?: string | null;
  pageUrl?: string | null;
  metadata?: string | null;
  timeOnPage?: number | null;
  scrollDepth?: number | null;
  customerId?: string | null;
}

export interface SiteVisitRecord extends SiteVisitPayload {
  id: number;
  createdAt: Date;
  recordingKey?: string | null;
}

export interface SessionSummaryPayload {
  session_id: string;
  visitor_id?: string | null;
  customer_id?: string | null;
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  ip_address?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
  is_new_visitor?: VisitorType | null;
  start_time: Date;
  last_activity: Date;
  event_count: number;
  max_scroll_depth?: number | null;
  avg_time_on_page?: number | null;
  metadata?: string | null;
  recording_key?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

// ─── ANALYTICS QUERY TYPES ───────────────────────────────────────────────────

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
  visitorType?: VisitorType;
  hasRecording?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DashboardSummary {
  totalSessions: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  bounceRate: number;         // percentage 0-100
  avgSessionDuration: number; // seconds
  totalPageViews: number;
  totalEvents: number;
}

export interface DeviceBreakdown {
  dimension: string;          // device type | browser | OS name
  count: number;
  percentage: number;
}

export interface TopPage {
  pageUrl: string;
  views: number;
  uniqueSessions: number;
  avgTimeOnPage: number;      // seconds
}

export interface FunnelStep {
  url: string;
  sessions: number;
  conversionRate: number;     // 0-100 relative to first step
  dropOffRate: number;        // 0-100 relative to previous step
}

export interface UtmBreakdown {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  sessions: number;
  newVisitors: number;
}

// ─── STORAGE INTERFACES ──────────────────────────────────────────────────────

/** Write-side storage interface — implement to persist tracking events */
export interface TrackerStorage {
  saveSiteVisit(data: SiteVisitPayload): Promise<void>;
  saveSessionSummary(data: SessionSummaryPayload): Promise<void>;
  getSessionSummary(sessionId: string): Promise<SessionSummaryPayload | null>;
  updateSessionRecording(sessionId: string, recordingKey: string): Promise<void>;
}

/** Read-side storage interface — implement to power analytics admin queries */
export interface TrackerAnalyticsStorage {
  listSessions(filters: SessionFilters): Promise<{ sessions: SessionSummaryPayload[]; total: number }>;
  getSessionJourney(sessionId: string): Promise<SiteVisitRecord[]>;
  getSessionSummary(sessionId: string): Promise<SessionSummaryPayload | null>;
  getDashboardSummary(range: DateRange): Promise<DashboardSummary>;
  getDeviceBreakdown(type: 'device' | 'browser' | 'os', range: DateRange): Promise<DeviceBreakdown[]>;
  getTopPages(range: DateRange, limit?: number): Promise<TopPage[]>;
  getFunnelSteps(urls: string[], range: DateRange): Promise<FunnelStep[]>;
  getUtmBreakdown(range: DateRange): Promise<UtmBreakdown[]>;
  getActiveVisitorCount(withinSeconds?: number): Promise<number>;
}

/** Combined interface — all built-in adapters implement both */
export interface FullTrackerStorage extends TrackerStorage, TrackerAnalyticsStorage {}

// ─── REPLAY STORAGE INTERFACE ────────────────────────────────────────────────

export interface ReplayStorage {
  uploadChunk(sessionId: string, chunkFileName: string, buffer: Buffer): Promise<string>;
  listChunks(sessionId: string, recordingKey: string): Promise<string[]>;
  getChunk(key: string): Promise<Buffer>;
}
