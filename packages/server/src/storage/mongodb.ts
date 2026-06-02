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
 * MongoTrackerStorage
 *
 * MongoDB adapter using the native `mongodb` driver.
 * Collections are auto-created with the correct indexes on first use.
 *
 * @example
 * import { MongoClient } from 'mongodb'
 * const client = new MongoClient(process.env.MONGODB_URI)
 * await client.connect()
 *
 * const storage = new MongoTrackerStorage(client.db('mydb'))
 *
 * // Custom collection names
 * const storage = new MongoTrackerStorage(client.db('mydb'), {
 *   siteVisitsCollection: 'tracker_events',
 *   sessionSummariesCollection: 'tracker_sessions',
 * })
 */

// Minimal MongoDB type shapes (avoids mandatory peer dep for TS users)
interface MongoCollection<T extends object> {
  insertOne(doc: T): Promise<unknown>;
  findOne(filter: object): Promise<T | null>;
  find(filter: object): {
    sort(s: object): {
      skip(n: number): {
        limit(n: number): { toArray(): Promise<T[]> }
      };
      toArray(): Promise<T[]>;
    };
    toArray(): Promise<T[]>;
  };
  countDocuments(filter?: object): Promise<number>;
  updateOne(filter: object, update: object, options?: object): Promise<unknown>;
  aggregate(pipeline: object[]): { toArray(): Promise<Record<string, unknown>[]> };
  createIndex(keys: object, options?: object): Promise<unknown>;
}

interface MongoDb {
  collection<T extends object = Record<string, unknown>>(name: string): MongoCollection<T>;
}

export interface MongoTrackerStorageOptions {
  siteVisitsCollection?: string;
  sessionSummariesCollection?: string;
}

export class MongoTrackerStorage implements FullTrackerStorage {
  private db: MongoDb;
  private svName: string;
  private ssName: string;
  private initialized = false;

  constructor(db: MongoDb, options?: MongoTrackerStorageOptions) {
    this.db = db;
    this.svName = options?.siteVisitsCollection ?? 'site_visits';
    this.ssName = options?.sessionSummariesCollection ?? 'session_summaries';
  }

  private get sv() { return this.db.collection<Record<string, unknown>>(this.svName); }
  private get ss() { return this.db.collection<Record<string, unknown>>(this.ssName); }

  private async ensureIndexes(): Promise<void> {
    if (this.initialized) return;
    await this.sv.createIndex({ session_id: 1 });
    await this.sv.createIndex({ visitor_id: 1 });
    await this.sv.createIndex({ created_at: -1 });
    await this.sv.createIndex({ event_type: 1 });
    await this.sv.createIndex({ page_url: 1 });
    await this.ss.createIndex({ session_id: 1 }, { unique: true });
    await this.ss.createIndex({ last_activity: -1 });
    await this.ss.createIndex({ visitor_id: 1 });
    await this.ss.createIndex({ customer_id: 1 });
    await this.ss.createIndex({ country: 1 });
    await this.ss.createIndex({ device_type: 1 });
    this.initialized = true;
  }

  // ─── WRITE ────────────────────────────────────────────────────────────────

  public async saveSiteVisit(data: SiteVisitPayload): Promise<void> {
    await this.ensureIndexes();
    const now = new Date();

    // Deduplicate within 2s
    if (data.sessionId && data.eventType && data.pageUrl) {
      const twoSecondsAgo = new Date(Date.now() - 2000);
      const existing = await this.sv.findOne({
        session_id: data.sessionId,
        event_type: data.eventType,
        page_url: data.pageUrl,
        created_at: { $gt: twoSecondsAgo },
      });
      if (existing) return;
    }

    // Determine visitor type
    let isNewVisitor: VisitorType | null = null;
    if (data.visitorId && (!data.eventType || data.eventType === 'PAGE_VIEW')) {
      const prev = await this.sv.findOne({ visitor_id: data.visitorId, session_id: { $ne: data.sessionId } });
      isNewVisitor = prev ? 'returning' : 'new';
    }

    await this.sv.insertOne({
      session_id: data.sessionId,
      visitor_id: data.visitorId ?? null,
      device_type: data.deviceType ?? null,
      browser: data.browser ?? null,
      os: data.os ?? null,
      country: data.country ?? null,
      ip_address: data.ipAddress ?? null,
      utm_source: data.utmSource ?? null,
      utm_medium: data.utmMedium ?? null,
      utm_campaign: data.utmCampaign ?? null,
      utm_content: data.utmContent ?? null,
      utm_term: data.utmTerm ?? null,
      referrer: data.referrer ?? null,
      landing_page: data.landingPage ?? null,
      event_type: data.eventType ?? 'PAGE_VIEW',
      event_label: data.eventLabel ?? null,
      page_url: data.pageUrl ?? null,
      metadata: data.metadata ?? null,
      time_on_page: data.timeOnPage ?? null,
      scroll_depth: data.scrollDepth ?? null,
      is_new_visitor: isNewVisitor,
      customer_id: data.customerId ?? null,
      created_at: now,
      updated_at: now,
    });

    // Upsert session summary
    await this.ss.updateOne(
      { session_id: data.sessionId },
      {
        $setOnInsert: {
          session_id: data.sessionId,
          visitor_id: data.visitorId ?? null,
          device_type: data.deviceType ?? null,
          browser: data.browser ?? null,
          os: data.os ?? null,
          country: data.country ?? null,
          ip_address: data.ipAddress ?? null,
          utm_source: data.utmSource ?? null,
          utm_medium: data.utmMedium ?? null,
          utm_campaign: data.utmCampaign ?? null,
          referrer: data.referrer ?? null,
          landing_page: data.landingPage ?? null,
          is_new_visitor: isNewVisitor,
          start_time: now,
          created_at: now,
        },
        $set: {
          last_activity: now,
          updated_at: now,
          ...(data.customerId ? { customer_id: data.customerId } : {}),
        },
        $inc: { event_count: 1 },
        $max: { max_scroll_depth: data.scrollDepth ?? 0 },
      },
      { upsert: true }
    );
  }

  public async saveSessionSummary(data: SessionSummaryPayload): Promise<void> {
    await this.ensureIndexes();
    await this.ss.updateOne(
      { session_id: data.session_id },
      { $set: { ...data, updated_at: new Date() } },
      { upsert: true }
    );
  }

  public async getSessionSummary(sessionId: string): Promise<SessionSummaryPayload | null> {
    await this.ensureIndexes();
    const doc = await this.ss.findOne({ session_id: sessionId });
    if (!doc) return null;
    return this.mapSessionSummary(doc);
  }

  public async updateSessionRecording(sessionId: string, recordingKey: string): Promise<void> {
    await this.ss.updateOne(
      { session_id: sessionId },
      { $set: { recording_key: recordingKey, updated_at: new Date() } }
    );
  }

  // ─── ANALYTICS READ ───────────────────────────────────────────────────────

  public async listSessions(
    filters: SessionFilters
  ): Promise<{ sessions: SessionSummaryPayload[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filters.from || filters.to) {
      query['last_activity'] = {};
      if (filters.from) (query['last_activity'] as Record<string, unknown>)['$gte'] = filters.from;
      if (filters.to) (query['last_activity'] as Record<string, unknown>)['$lte'] = filters.to;
    }
    if (filters.country) query['country'] = filters.country;
    if (filters.device) query['device_type'] = filters.device;
    if (filters.browser) query['browser'] = filters.browser;
    if (filters.customerId) query['customer_id'] = filters.customerId;
    if (filters.visitorType) query['is_new_visitor'] = filters.visitorType;
    if (filters.hasRecording === true) query['recording_key'] = { $exists: true, $ne: null };
    if (filters.hasRecording === false) query['recording_key'] = { $exists: false };

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;

    const [total, docs] = await Promise.all([
      this.ss.countDocuments(query),
      this.ss
        .find(query)
        .sort({ last_activity: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray() as Promise<Record<string, unknown>[]>,
    ]);

    return { total, sessions: docs.map((d) => this.mapSessionSummary(d)) };
  }

  public async getSessionJourney(sessionId: string): Promise<SiteVisitPayload[]> {
    const docs = await this.sv.find({ session_id: sessionId }).sort({ created_at: 1 }).toArray();
    return docs.map((d) => this.mapSiteVisit(d));
  }

  public async getDashboardSummary(range: DateRange): Promise<DashboardSummary> {
    const matchRange = { last_activity: { $gte: range.from, $lte: range.to } };
    const [agg] = await this.ss.aggregate([
      { $match: matchRange },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$visitor_id' },
          totalEvents: { $sum: '$event_count' },
          avgDuration: { $avg: '$avg_time_on_page' },
          newCount: { $sum: { $cond: [{ $eq: ['$is_new_visitor', 'new'] }, 1, 0] } },
          returningCount: { $sum: { $cond: [{ $eq: ['$is_new_visitor', 'returning'] }, 1, 0] } },
          bounceCount: { $sum: { $cond: [{ $eq: ['$event_count', 1] }, 1, 0] } },
        },
      },
    ]).toArray();

    const [pvAgg] = await this.sv.aggregate([
      { $match: { created_at: { $gte: range.from, $lte: range.to }, event_type: 'PAGE_VIEW' } },
      { $count: 'total' },
    ]).toArray();

    const totalSessions = Number(agg?.['totalSessions'] ?? 0);
    const bounceCount = Number(agg?.['bounceCount'] ?? 0);
    const uniqueArr = (agg?.['uniqueVisitors'] as unknown[]) ?? [];

    return {
      totalSessions,
      uniqueVisitors: uniqueArr.length,
      newVisitors: Number(agg?.['newCount'] ?? 0),
      returningVisitors: Number(agg?.['returningCount'] ?? 0),
      bounceRate: totalSessions > 0 ? Math.round((bounceCount / totalSessions) * 100) : 0,
      avgSessionDuration: Math.round(Number(agg?.['avgDuration'] ?? 0)),
      totalPageViews: Number(pvAgg?.['total'] ?? 0),
      totalEvents: Number(agg?.['totalEvents'] ?? 0),
    };
  }

  public async getDeviceBreakdown(
    type: 'device' | 'browser' | 'os',
    range: DateRange
  ): Promise<DeviceBreakdown[]> {
    const field = type === 'device' ? 'device_type' : type === 'browser' ? 'browser' : 'os';
    const rows = await this.ss.aggregate([
      { $match: { last_activity: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();

    const total = rows.reduce((a, r) => a + Number(r['count']), 0);
    return rows.map((r) => ({
      dimension: (r['_id'] as string | null) ?? 'Unknown',
      count: Number(r['count']),
      percentage: total > 0 ? Math.round((Number(r['count']) / total) * 100) : 0,
    }));
  }

  public async getTopPages(range: DateRange, limit = 20): Promise<TopPage[]> {
    const rows = await this.sv.aggregate([
      { $match: { created_at: { $gte: range.from, $lte: range.to }, event_type: 'PAGE_VIEW', page_url: { $ne: null } } },
      {
        $group: {
          _id: '$page_url',
          views: { $sum: 1 },
          sessions: { $addToSet: '$session_id' },
          avgTime: { $avg: '$time_on_page' },
        },
      },
      { $sort: { views: -1 } },
      { $limit: limit },
    ]).toArray();

    return rows.map((r) => ({
      pageUrl: (r['_id'] as string) ?? '',
      views: Number(r['views']),
      uniqueSessions: ((r['sessions'] as unknown[]) ?? []).length,
      avgTimeOnPage: Math.round(Number(r['avgTime'] ?? 0)),
    }));
  }

  public async getFunnelSteps(urls: string[], range: DateRange): Promise<FunnelStep[]> {
    const results: FunnelStep[] = [];
    let firstCount = 0;
    let prevCount = 0;
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const [row] = await this.sv.aggregate([
        {
          $match: {
            created_at: { $gte: range.from, $lte: range.to },
            page_url: { $regex: url, $options: 'i' },
          },
        },
        { $group: { _id: '$session_id' } },
        { $count: 'sessions' },
      ]).toArray();
      const sessions = Number(row?.['sessions'] ?? 0);
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
    const rows = await this.ss.aggregate([
      { $match: { last_activity: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: { source: '$utm_source', medium: '$utm_medium', campaign: '$utm_campaign' },
          sessions: { $sum: 1 },
          newVisitors: { $sum: { $cond: [{ $eq: ['$is_new_visitor', 'new'] }, 1, 0] } },
        },
      },
      { $sort: { sessions: -1 } },
      { $limit: 50 },
    ]).toArray();

    return rows.map((r) => {
      const id = r['_id'] as { source: string | null; medium: string | null; campaign: string | null };
      return {
        source: id.source,
        medium: id.medium,
        campaign: id.campaign,
        sessions: Number(r['sessions']),
        newVisitors: Number(r['newVisitors']),
      };
    });
  }

  public async getActiveVisitorCount(withinSeconds = 300): Promise<number> {
    const since = new Date(Date.now() - withinSeconds * 1000);
    const [row] = await this.sv.aggregate([
      { $match: { created_at: { $gte: since } } },
      { $group: { _id: '$session_id' } },
      { $count: 'active' },
    ]).toArray();
    return Number(row?.['active'] ?? 0);
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private mapSessionSummary(doc: Record<string, unknown>): SessionSummaryPayload {
    return {
      session_id: doc['session_id'] as string,
      visitor_id: (doc['visitor_id'] as string | null) ?? null,
      customer_id: (doc['customer_id'] as string | null) ?? null,
      device_type: (doc['device_type'] as string | null) ?? null,
      browser: (doc['browser'] as string | null) ?? null,
      os: (doc['os'] as string | null) ?? null,
      country: (doc['country'] as string | null) ?? null,
      ip_address: (doc['ip_address'] as string | null) ?? null,
      utm_source: (doc['utm_source'] as string | null) ?? null,
      utm_medium: (doc['utm_medium'] as string | null) ?? null,
      utm_campaign: (doc['utm_campaign'] as string | null) ?? null,
      referrer: (doc['referrer'] as string | null) ?? null,
      landing_page: (doc['landing_page'] as string | null) ?? null,
      is_new_visitor: (doc['is_new_visitor'] as VisitorType | null) ?? null,
      start_time: doc['start_time'] as Date,
      last_activity: doc['last_activity'] as Date,
      event_count: Number(doc['event_count'] ?? 0),
      max_scroll_depth: (doc['max_scroll_depth'] as number | null) ?? null,
      avg_time_on_page: (doc['avg_time_on_page'] as number | null) ?? null,
      metadata: (doc['metadata'] as string | null) ?? null,
      recording_key: (doc['recording_key'] as string | null) ?? null,
      created_at: doc['created_at'] as Date | undefined,
      updated_at: doc['updated_at'] as Date | undefined,
    };
  }

  private mapSiteVisit(doc: Record<string, unknown>): SiteVisitPayload {
    return {
      sessionId: doc['session_id'] as string,
      visitorId: (doc['visitor_id'] as string | null) ?? null,
      deviceType: (doc['device_type'] as string | null) ?? null,
      browser: (doc['browser'] as string | null) ?? null,
      os: (doc['os'] as string | null) ?? null,
      country: (doc['country'] as string | null) ?? null,
      ipAddress: (doc['ip_address'] as string | null) ?? null,
      utmSource: (doc['utm_source'] as string | null) ?? null,
      utmMedium: (doc['utm_medium'] as string | null) ?? null,
      utmCampaign: (doc['utm_campaign'] as string | null) ?? null,
      utmContent: (doc['utm_content'] as string | null) ?? null,
      utmTerm: (doc['utm_term'] as string | null) ?? null,
      referrer: (doc['referrer'] as string | null) ?? null,
      landingPage: (doc['landing_page'] as string | null) ?? null,
      eventType: (doc['event_type'] as SiteVisitPayload['eventType']) ?? null,
      eventLabel: (doc['event_label'] as string | null) ?? null,
      pageUrl: (doc['page_url'] as string | null) ?? null,
      metadata: (doc['metadata'] as string | null) ?? null,
      timeOnPage: (doc['time_on_page'] as number | null) ?? null,
      scrollDepth: (doc['scroll_depth'] as number | null) ?? null,
      customerId: (doc['customer_id'] as string | null) ?? null,
    };
  }
}
