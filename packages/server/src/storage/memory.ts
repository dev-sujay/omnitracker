import {
  SiteVisitPayload,
  SessionSummaryPayload,
  FullTrackerStorage,
  DateRange,
  SessionFilters,
  DashboardSummary,
  DeviceBreakdown,
  TopPage,
  FunnelStep,
  UtmBreakdown,
  VisitorType,
} from '../types.js';

/**
 * MemoryTrackerStorage
 *
 * Zero-dependency in-memory adapter. Perfect for:
 * - Local development / quick start
 * - Unit testing
 * - Serverless functions with short lifetimes
 *
 * @example
 * const storage = new MemoryTrackerStorage()
 */
export class MemoryTrackerStorage implements FullTrackerStorage {
  private visits: (SiteVisitPayload & { created_at: Date })[] = [];
  private summaries: Map<string, SessionSummaryPayload> = new Map();

  // ─── WRITE METHODS ────────────────────────────────────────────────────────

  public async saveSiteVisit(data: SiteVisitPayload): Promise<void> {
    const now = new Date();
    this.visits.push({ ...data, created_at: now });

    const existing = this.summaries.get(data.sessionId);
    if (!existing) {
      this.summaries.set(data.sessionId, {
        session_id: data.sessionId,
        visitor_id: data.visitorId,
        customer_id: data.customerId,
        device_type: data.deviceType,
        browser: data.browser,
        os: data.os,
        country: data.country,
        ip_address: data.ipAddress,
        utm_source: data.utmSource,
        utm_medium: data.utmMedium,
        utm_campaign: data.utmCampaign,
        referrer: data.referrer,
        landing_page: data.landingPage,
        start_time: now,
        last_activity: now,
        event_count: 1,
        max_scroll_depth: data.scrollDepth ?? 0,
        avg_time_on_page: data.timeOnPage ?? null,
        created_at: now,
        updated_at: now,
      });
    } else {
      existing.last_activity = now;
      existing.event_count += 1;
      if (data.scrollDepth) {
        existing.max_scroll_depth = Math.max(existing.max_scroll_depth ?? 0, data.scrollDepth);
      }
      if (data.customerId) existing.customer_id = data.customerId;
      if (data.timeOnPage) {
        existing.avg_time_on_page = existing.avg_time_on_page
          ? Math.round((existing.avg_time_on_page + data.timeOnPage) / 2)
          : data.timeOnPage;
      }
      existing.updated_at = now;
      this.summaries.set(data.sessionId, existing);
    }
  }

  public async saveSessionSummary(data: SessionSummaryPayload): Promise<void> {
    this.summaries.set(data.session_id, { ...data, updated_at: new Date() });
  }

  public async getSessionSummary(sessionId: string): Promise<SessionSummaryPayload | null> {
    return this.summaries.get(sessionId) ?? null;
  }

  public async updateSessionRecording(sessionId: string, recordingKey: string): Promise<void> {
    const s = this.summaries.get(sessionId);
    if (s) {
      s.recording_key = recordingKey;
      s.updated_at = new Date();
      this.summaries.set(sessionId, s);
    }
  }

  // ─── ANALYTICS READ METHODS ───────────────────────────────────────────────

  public async listSessions(
    filters: SessionFilters
  ): Promise<{ sessions: SessionSummaryPayload[]; total: number }> {
    let all = Array.from(this.summaries.values());
    const { from, to, country, device, browser, customerId, visitorType, hasRecording, page = 1, limit = 25 } = filters;

    if (from) all = all.filter((s) => s.last_activity >= from);
    if (to) all = all.filter((s) => s.last_activity <= to);
    if (country) all = all.filter((s) => s.country === country);
    if (device) all = all.filter((s) => s.device_type === device);
    if (browser) all = all.filter((s) => s.browser === browser);
    if (customerId) all = all.filter((s) => s.customer_id === customerId);
    if (visitorType) all = all.filter((s) => s.is_new_visitor === visitorType);
    if (hasRecording === true) all = all.filter((s) => !!s.recording_key);
    if (hasRecording === false) all = all.filter((s) => !s.recording_key);

    all.sort((a, b) => b.last_activity.getTime() - a.last_activity.getTime());

    return {
      total: all.length,
      sessions: all.slice((page - 1) * limit, page * limit),
    };
  }

  public async getSessionJourney(sessionId: string): Promise<SiteVisitPayload[]> {
    return this.visits
      .filter((v) => v.sessionId === sessionId)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  }

  public async getDashboardSummary(range: DateRange): Promise<DashboardSummary> {
    const sessions = Array.from(this.summaries.values()).filter(
      (s) => s.last_activity >= range.from && s.last_activity <= range.to
    );
    const visits = this.visits.filter(
      (v) => v.created_at >= range.from && v.created_at <= range.to
    );

    const totalSessions = sessions.length;
    const uniqueVisitors = new Set(sessions.map((s) => s.visitor_id)).size;
    const newVisitors = sessions.filter((s) => s.is_new_visitor === 'new').length;
    const returningVisitors = sessions.filter((s) => s.is_new_visitor === 'returning').length;
    const bounceSessions = sessions.filter((s) => s.event_count === 1).length;
    const avgDurations = sessions.map((s) => s.avg_time_on_page ?? 0).filter((v) => v > 0);
    const avgSessionDuration = avgDurations.length
      ? Math.round(avgDurations.reduce((a, b) => a + b, 0) / avgDurations.length)
      : 0;

    return {
      totalSessions,
      uniqueVisitors,
      newVisitors,
      returningVisitors,
      bounceRate: totalSessions > 0 ? Math.round((bounceSessions / totalSessions) * 100) : 0,
      avgSessionDuration,
      totalPageViews: visits.filter((v) => v.eventType === 'PAGE_VIEW').length,
      totalEvents: sessions.reduce((a, s) => a + s.event_count, 0),
    };
  }

  public async getDeviceBreakdown(
    type: 'device' | 'browser' | 'os',
    range: DateRange
  ): Promise<DeviceBreakdown[]> {
    const sessions = Array.from(this.summaries.values()).filter(
      (s) => s.last_activity >= range.from && s.last_activity <= range.to
    );
    const counts = new Map<string, number>();
    for (const s of sessions) {
      const key = (type === 'device' ? s.device_type : type === 'browser' ? s.browser : s.os) ?? 'Unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const total = sessions.length;
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([dimension, cnt]) => ({
        dimension,
        count: cnt,
        percentage: total > 0 ? Math.round((cnt / total) * 100) : 0,
      }));
  }

  public async getTopPages(range: DateRange, limit = 20): Promise<TopPage[]> {
    const visits = this.visits.filter(
      (v) => v.created_at >= range.from && v.created_at <= range.to && v.eventType === 'PAGE_VIEW' && v.pageUrl
    );
    const grouped = new Map<string, { views: number; sessions: Set<string>; times: number[] }>();
    for (const v of visits) {
      const url = v.pageUrl ?? '';
      const g = grouped.get(url) ?? { views: 0, sessions: new Set(), times: [] };
      g.views += 1;
      g.sessions.add(v.sessionId);
      if (v.timeOnPage) g.times.push(v.timeOnPage);
      grouped.set(url, g);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => b[1].views - a[1].views)
      .slice(0, limit)
      .map(([pageUrl, g]) => ({
        pageUrl,
        views: g.views,
        uniqueSessions: g.sessions.size,
        avgTimeOnPage: g.times.length
          ? Math.round(g.times.reduce((a, b) => a + b, 0) / g.times.length)
          : 0,
      }));
  }

  public async getFunnelSteps(urls: string[], range: DateRange): Promise<FunnelStep[]> {
    const visits = this.visits.filter(
      (v) => v.created_at >= range.from && v.created_at <= range.to
    );
    const results: FunnelStep[] = [];
    let firstCount = 0;
    let prevCount = 0;
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const sessions = new Set(visits.filter((v) => v.pageUrl?.includes(url)).map((v) => v.sessionId)).size;
      if (i === 0) firstCount = sessions;
      results.push({
        url,
        sessions,
        conversionRate: firstCount > 0 ? Math.round((sessions / firstCount) * 100) : 0,
        dropOffRate: prevCount > 0 ? Math.round(((prevCount - sessions) / prevCount) * 100) : 0,
      });
      prevCount = sessions;
    }
    return results;
  }

  public async getUtmBreakdown(range: DateRange): Promise<UtmBreakdown[]> {
    const sessions = Array.from(this.summaries.values()).filter(
      (s) => s.last_activity >= range.from && s.last_activity <= range.to
    );
    const key = (s: SessionSummaryPayload) => `${s.utm_source ?? ''}|${s.utm_medium ?? ''}|${s.utm_campaign ?? ''}`;
    const grouped = new Map<string, { source: string | null; medium: string | null; campaign: string | null; sessions: number; newVisitors: number }>();
    for (const s of sessions) {
      const k = key(s);
      const g = grouped.get(k) ?? { source: s.utm_source ?? null, medium: s.utm_medium ?? null, campaign: s.utm_campaign ?? null, sessions: 0, newVisitors: 0 };
      g.sessions += 1;
      if (s.is_new_visitor === 'new') g.newVisitors += 1;
      grouped.set(k, g);
    }
    return Array.from(grouped.values()).sort((a, b) => b.sessions - a.sessions);
  }

  public async getActiveVisitorCount(withinSeconds = 300): Promise<number> {
    const since = new Date(Date.now() - withinSeconds * 1000);
    return new Set(this.visits.filter((v) => v.created_at >= since).map((v) => v.sessionId)).size;
  }

  /** Direct access to raw visits — useful for debugging/testing */
  public getVisits(): SiteVisitPayload[] { return this.visits; }

  /** Direct access to raw summaries — useful for debugging/testing */
  public getSummaries(): SessionSummaryPayload[] { return Array.from(this.summaries.values()); }
}
