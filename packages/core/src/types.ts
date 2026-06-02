export interface TrackerCoreConfig {
  apiUrl: string;
  sessionExpirationTimeout?: number; // default: 30 minutes
  inactivityTimeout?: number; // default: 5 minutes
  getAuthToken?: () => string | null | undefined;
  customHeaders?: Record<string, string>;
  debug?: boolean;
}

export interface ITrackerCore {
  getSessionId(): string;
  getVisitorId(): string;
  track(
    type: 'PAGE_VIEW' | 'CLICK' | 'PAGE_EXIT' | 'SCROLL' | 'RAGE_CLICK' | 'CUSTOM',
    label: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;
  trackPageView(title?: string): void;
  config: Required<TrackerCoreConfig>;
}

export interface TrackingEvent {
  sessionId: string;
  visitorId: string;
  deviceType: string;
  browser: string;
  os: string;
  country?: string;
  ipAddress?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  landingPage?: string;
  eventType: 'PAGE_VIEW' | 'CLICK' | 'PAGE_EXIT' | 'SCROLL' | 'RAGE_CLICK' | 'CUSTOM';
  eventLabel: string;
  pageUrl: string;
  metadata?: string;
  timeOnPage?: number;
  scrollDepth?: number;
  customerId?: number | string;
}

export interface TrackerPlugin {
  name: string;
  onInit?(tracker: ITrackerCore): void | Promise<void>;
  onEvent?(type: string, label: string, metadata?: Record<string, unknown>): void;
  onDestroy?(): void;
}
