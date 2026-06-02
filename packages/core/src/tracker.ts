import { TrackerCoreConfig, TrackerPlugin, TrackingEvent, ITrackerCore } from './types.js';
import { enqueueFailedEvent, flushEventQueue } from './event-queue.js';

const ORGANIC_SEARCH_HOSTS = [
  'google.',
  'bing.com',
  'yahoo.com',
  'duckduckgo.com',
  'baidu.com',
  'yandex.',
  'ecosia.org',
  'qwant.com',
  'brave.com',
  'startpage.com',
  'search.aol.com',
  'ask.com',
];

function isOrganicSearchReferrer(referrer: string): boolean {
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return ORGANIC_SEARCH_HOSTS.some((s) => host.includes(s));
  } catch {
    return false;
  }
}

function getOS(userAgent: string): string {
  if (/windows phone/i.test(userAgent)) return 'Windows Phone';
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/Mac/i.test(userAgent)) return 'macOS';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/Linux/i.test(userAgent)) return 'Linux';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  return 'Unknown';
}

function getBrowser(userAgent: string): string {
  if (/edg/i.test(userAgent)) return 'Edge';
  if (/chrome|crios|crmo/i.test(userAgent)) return 'Chrome';
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/opr\//i.test(userAgent)) return 'Opera';
  return 'Unknown';
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'Desktop';
  const width = window.innerWidth;
  if (width <= 767) return 'Mobile';
  if (width <= 1023) return 'Tablet';
  return 'Desktop';
}

export class TrackerCore implements ITrackerCore {
  public config: Required<TrackerCoreConfig>;
  private plugins: Map<string, TrackerPlugin> = new Map();
  private pageEnterTime: number = Date.now();
  private hasExited: boolean = false;
  private lastEvent: { type: string; label: string; time: number } | null = null;
  private lastEventPayload: Record<string, unknown> | null = null;
  private clickListener: ((e: MouseEvent) => void) | null = null;

  constructor(config: TrackerCoreConfig) {
    this.config = {
      apiUrl: config.apiUrl.replace(/\/$/, ''),
      sessionExpirationTimeout: config.sessionExpirationTimeout ?? 30 * 60 * 1000,
      inactivityTimeout: config.inactivityTimeout ?? 5 * 60 * 1000,
      getAuthToken: config.getAuthToken ?? (() => null),
      customHeaders: config.customHeaders ?? {},
      debug: config.debug ?? false,
    };
  }

  public use(plugin: TrackerPlugin): void {
    if (this.plugins.has(plugin.name)) {
      this.log(`Plugin "${plugin.name}" is already registered.`);
      return;
    }
    this.plugins.set(plugin.name, plugin);
    this.log(`Registered plugin: ${plugin.name}`);
  }

  public async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    this.log('Initializing tracker...');
    this.pageEnterTime = Date.now();
    this.hasExited = false;

    // 1. Flush offline events queue
    this.flushQueue();

    // 2. Initialize plugins
    for (const plugin of this.plugins.values()) {
      if (plugin.onInit) {
        try {
          await plugin.onInit(this);
        } catch (err) {
          console.error(`Error initializing plugin "${plugin.name}":`, err);
        }
      }
    }

    // 3. Set up browser lifecycle listeners for exit page tracking
    this.setupExitListeners();

    // 4. Set up auto click tracking
    this.setupClickTracking();

    // 5. Track initial page view
    this.trackPageView();

    // 6. Watch for history pushState/replaceState for SPA route changes
    this.setupSpaRoutingListeners();
  }

  public getSessionId(): string {
    const SESSION_ID_KEY = 'ds_tracker_session_id';
    const LAST_ACTIVITY_KEY = 'ds_tracker_last_activity';
    const SESSION_SOURCE_KEY = 'ds_tracker_session_source';
    const SESSION_MEDIUM_KEY = 'ds_tracker_session_medium';

    const currentTime = Date.now();
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    const isExpired = lastActivity && (currentTime - parseInt(lastActivity, 10)) > this.config.sessionExpirationTimeout;

    let sessionId = localStorage.getItem(SESSION_ID_KEY);
    
    // Check if traffic channel changed via URL query params
    const searchParams = new URLSearchParams(window.location.search);
    const currentUtmSource = searchParams.get('utm_source');
    const currentUtmMedium = searchParams.get('utm_medium');
    const storedSource = localStorage.getItem(SESSION_SOURCE_KEY);
    const isSourceChanged = currentUtmSource !== null && currentUtmSource !== storedSource;

    if (!sessionId || isExpired || isSourceChanged) {
      sessionId = this.generateUUID();
      localStorage.setItem(SESSION_ID_KEY, sessionId);
      
      if (currentUtmSource) localStorage.setItem(SESSION_SOURCE_KEY, currentUtmSource);
      else localStorage.removeItem(SESSION_SOURCE_KEY);
      
      if (currentUtmMedium) localStorage.setItem(SESSION_MEDIUM_KEY, currentUtmMedium);
      else localStorage.removeItem(SESSION_MEDIUM_KEY);

      // Reset landing page
      localStorage.setItem('ds_tracker_landing_page', window.location.pathname + window.location.search);
    }

    localStorage.setItem(LAST_ACTIVITY_KEY, currentTime.toString());
    return sessionId;
  }

  public getVisitorId(): string {
    const VISITOR_ID_KEY = 'ds_tracker_visitor_id';
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = this.generateUUID();
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    return visitorId;
  }

  public async track(
    type: TrackingEvent['eventType'],
    label: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const now = Date.now();

    // Prevent identical event double-fire within 1s (deduplication)
    if (
      this.lastEvent &&
      this.lastEvent.type === type &&
      this.lastEvent.label === label &&
      (now - this.lastEvent.time) < 1000
    ) {
      return;
    }
    this.lastEvent = { type, label, time: now };

    // Update last activity timer
    localStorage.setItem('ds_tracker_last_activity', now.toString());

    // Build base payload
    const payload = this.buildPayload(type, label, metadata);
    this.lastEventPayload = payload;

    // Trigger plugin onEvent hooks
    for (const plugin of this.plugins.values()) {
      if (plugin.onEvent) {
        try {
          plugin.onEvent(type, label, metadata);
        } catch (err) {
          console.error(`Error in plugin "${plugin.name}" onEvent:`, err);
        }
      }
    }

    // Send payload
    this.sendPayload(payload);
  }

  public trackPageView(title?: string): void {
    const pageTitle = title || document.title;
    this.track('PAGE_VIEW', pageTitle);
  }

  public destroy(): void {
    if (typeof window === 'undefined') return;

    this.log('Destroying tracker instance...');
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
    }

    for (const plugin of this.plugins.values()) {
      if (plugin.onDestroy) {
        try {
          plugin.onDestroy();
        } catch (err) {
          console.error(`Error destroying plugin "${plugin.name}":`, err);
        }
      }
    }
    this.plugins.clear();
  }

  private buildPayload(
    type: TrackingEvent['eventType'],
    label: string,
    metadata?: Record<string, unknown>
  ): Record<string, unknown> {
    const searchParams = new URLSearchParams(window.location.search);
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');
    const utmContent = searchParams.get('utm_content');
    const utmTerm = searchParams.get('utm_term');

    const docReferrer = document.referrer;
    const isOwnDomain = docReferrer && (
      docReferrer.includes(window.location.hostname)
    );
    const referrer = docReferrer && !isOwnDomain ? docReferrer : undefined;

    // Organic search detection fallback
    const resolvedUtmSource =
      utmSource ||
      (referrer && !utmSource && isOrganicSearchReferrer(referrer)
        ? new URL(referrer).hostname.replace('www.', '').split('.')[0]
        : undefined);
    const resolvedUtmMedium =
      utmMedium ||
      (referrer && !utmSource && isOrganicSearchReferrer(referrer) ? 'organic' : undefined);

    let landingPage = localStorage.getItem('ds_tracker_landing_page');
    if (!landingPage) {
      landingPage = window.location.pathname + window.location.search;
      localStorage.setItem('ds_tracker_landing_page', landingPage);
    }

    const ua = navigator.userAgent;

    const data: Record<string, unknown> = {
      sessionId: this.getSessionId(),
      visitorId: this.getVisitorId(),
      deviceType: getDeviceType(),
      browser: getBrowser(ua),
      os: getOS(ua),
      utmSource: resolvedUtmSource,
      utmMedium: resolvedUtmMedium,
      utmCampaign: utmCampaign || undefined,
      utmContent: utmContent || undefined,
      utmTerm: utmTerm || undefined,
      referrer,
      landingPage,
      eventType: type,
      eventLabel: label,
      pageUrl: window.location.href,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    };

    return data;
  }

  private getRequestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.customHeaders,
    };
    const token = this.config.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async sendPayload(payload: Record<string, unknown>): Promise<void> {
    try {
      const headers = this.getRequestHeaders();
      const sendTrack = async () => {
        const response = await fetch(`${this.config.apiUrl}/track-site-visit`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          enqueueFailedEvent('/track-site-visit', payload);
        }
      };

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => sendTrack());
      } else {
        setTimeout(sendTrack, 200);
      }
    } catch {
      enqueueFailedEvent('/track-site-visit', payload);
    }
  }

  private setupClickTracking(): void {
    this.clickListener = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickable = target.closest('a, button');
      if (clickable) {
        const label =
          clickable.textContent?.trim() ||
          clickable.getAttribute('aria-label') ||
          clickable.getAttribute('title') ||
          clickable.querySelector('img')?.getAttribute('alt') ||
          clickable.querySelector('svg')?.querySelector('title')?.textContent ||
          (clickable as HTMLAnchorElement).href?.split('/').pop() ||
          `Action: ${clickable.tagName}`;

        if (label) {
          this.track('CLICK', label, {
            tagName: clickable.tagName,
            href: (clickable as HTMLAnchorElement).href || undefined,
          });
        }
      }
    };
    document.addEventListener('click', this.clickListener, { capture: true });
  }

  private setupExitListeners(): void {
    const handleExit = () => {
      if (this.hasExited) return;
      this.hasExited = true;

      const timeOnPage = Math.round((Date.now() - this.pageEnterTime) / 1000);
      const exitData = {
        ...(this.lastEventPayload || {}),
        sessionId: this.getSessionId(),
        visitorId: this.getVisitorId(),
        eventType: 'PAGE_EXIT' as const,
        eventLabel: document.title,
        pageUrl: window.location.href,
        timeOnPage,
        metadata: JSON.stringify({ timeOnPage }),
      };

      try {
        const blob = new Blob([JSON.stringify(exitData)], { type: 'application/json' });
        fetch(`${this.config.apiUrl}/track-site-visit`, {
          method: 'POST',
          headers: this.getRequestHeaders(),
          body: blob,
          keepalive: true,
        }).catch(() => {
          enqueueFailedEvent('/track-site-visit', exitData);
        });
      } catch {
        enqueueFailedEvent('/track-site-visit', exitData);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleExit();
      } else {
        this.pageEnterTime = Date.now();
        this.hasExited = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleExit);
  }

  private setupSpaRoutingListeners(): void {
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.pageEnterTime = Date.now();
        this.hasExited = false;
        this.trackPageView();
      }
    });
    observer.observe(document, { subtree: true, childList: true });
  }

  private flushQueue(): void {
    flushEventQueue(this.config.apiUrl, () => {
      const headers: Record<string, string> = {};
      const token = this.config.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      return headers;
    }).catch(() => {});
  }

  private generateUUID(): string {
    if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[TrackerCore] ${message}`);
    }
  }
}
