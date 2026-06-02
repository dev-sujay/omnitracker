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
 * PrismaTrackerStorage
 *
 * Prisma ORM adapter. Works with any Prisma schema that has models matching
 * the OmniTracker field shape. Model names are configurable.
 *
 * @example
 * // schema.prisma must include SiteVisit and SessionSummary models:
 * //   model SiteVisit { ... }
 * //   model SessionSummary { ... }
 *
 * import { PrismaClient } from '@prisma/client'
 * const prisma = new PrismaClient()
 *
 * const storage = new PrismaTrackerStorage(prisma)
 *
 * // With custom model names
 * const storage = new PrismaTrackerStorage(prisma, {
 *   siteVisitModel: 'trackerEvent',
 *   sessionSummaryModel: 'trackerSession',
 * })
 */

// Minimal Prisma delegate shapes to avoid hard coupling to @prisma/client
interface PrismaDelegate<TCreate, TUpdate, TRecord> {
  create(args: { data: TCreate }): Promise<TRecord>;
  findUnique(args: { where: Record<string, unknown> }): Promise<TRecord | null>;
  findMany(args: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown> | Record<string, unknown>[];
    skip?: number;
    take?: number;
    select?: Record<string, unknown>;
  }): Promise<TRecord[]>;
  count(args?: { where?: Record<string, unknown> }): Promise<number>;
  upsert(args: {
    where: Record<string, unknown>;
    create: TCreate;
    update: TUpdate;
  }): Promise<TRecord>;
  update(args: { where: Record<string, unknown>; data: TUpdate }): Promise<TRecord>;
  groupBy(args: {
    by: string[];
    where?: Record<string, unknown>;
    _count?: Record<string, boolean>;
    _avg?: Record<string, boolean>;
    orderBy?: Record<string, unknown>[];
  }): Promise<Record<string, unknown>[]>;
}

type SiteVisitRecord = Record<string, unknown>;
type SessionSummaryRecord = Record<string, unknown>;

interface PrismaLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [model: string]: PrismaDelegate<any, any, any>;
}

export interface PrismaTrackerStorageOptions {
  /** Prisma model name for site visits (default: 'siteVisit') */
  siteVisitModel?: string;
  /** Prisma model name for session summaries (default: 'sessionSummary') */
  sessionSummaryModel?: string;
}

export class PrismaTrackerStorage implements FullTrackerStorage {
  private prisma: PrismaLike;
  private svModel: string;
  private ssModel: string;

  constructor(prisma: PrismaLike, options?: PrismaTrackerStorageOptions) {
    this.prisma = prisma;
    this.svModel = options?.siteVisitModel ?? 'siteVisit';
    this.ssModel = options?.sessionSummaryModel ?? 'sessionSummary';
  }

  private get sv() { return this.prisma[this.svModel]; }
  private get ss() { return this.prisma[this.ssModel]; }

  // ─── WRITE ────────────────────────────────────────────────────────────────

  public async saveSiteVisit(data: SiteVisitPayload): Promise<void> {
    const now = new Date();

    // Deduplicate within 2s
    if (data.sessionId && data.eventType && data.pageUrl) {
      const twoSecondsAgo = new Date(Date.now() - 2000);
      const existing = await this.sv.findMany({
        where: {
          session_id: data.sessionId,
          event_type: data.eventType,
          page_url: data.pageUrl,
          created_at: { gt: twoSecondsAgo },
        },
        take: 1,
      });
      if (existing.length > 0) return;
    }

    // Determine visitor type
    let isNewVisitor: VisitorType | null = null;
    if (data.visitorId && (!data.eventType || data.eventType === 'PAGE_VIEW')) {
      const prev = await this.sv.findMany({
        where: { visitor_id: data.visitorId, NOT: { session_id: data.sessionId } },
        take: 1,
      });
      isNewVisitor = prev.length > 0 ? 'returning' : 'new';
    }

    await this.sv.create({
      data: {
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
      },
    });

    const existing = await this.ss.findUnique({ where: { session_id: data.sessionId } }) as SessionSummaryRecord | null;

    if (!existing) {
      await this.ss.create({
        data: {
          session_id: data.sessionId,
          visitor_id: data.visitorId ?? null,
          customer_id: data.customerId ?? null,
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
          last_activity: now,
          event_count: 1,
          max_scroll_depth: data.scrollDepth ?? 0,
          avg_time_on_page: data.timeOnPage ?? null,
          created_at: now,
          updated_at: now,
        },
      });
    } else {
      const prevScrollDepth = Number(existing['max_scroll_depth'] ?? 0);
      const prevAvg = existing['avg_time_on_page'] ? Number(existing['avg_time_on_page']) : null;
      const newAvg = data.timeOnPage
        ? prevAvg != null ? Math.round((prevAvg + data.timeOnPage) / 2) : data.timeOnPage
        : prevAvg;

      await this.ss.update({
        where: { session_id: data.sessionId },
        data: {
          last_activity: now,
          event_count: { increment: 1 } as unknown,
          max_scroll_depth: data.scrollDepth ? Math.max(prevScrollDepth, data.scrollDepth) : prevScrollDepth,
          avg_time_on_page: newAvg,
          customer_id: data.customerId ?? existing['customer_id'],
          updated_at: now,
        },
      });
    }
  }

  public async saveSessionSummary(data: SessionSummaryPayload): Promise<void> {
    await this.ss.upsert({
      where: { session_id: data.session_id },
      create: {
        session_id: data.session_id,
        visitor_id: data.visitor_id ?? null,
        customer_id: data.customer_id ?? null,
        device_type: data.device_type ?? null,
        browser: data.browser ?? null,
        os: data.os ?? null,
        country: data.country ?? null,
        ip_address: data.ip_address ?? null,
        utm_source: data.utm_source ?? null,
        utm_medium: data.utm_medium ?? null,
        utm_campaign: data.utm_campaign ?? null,
        referrer: data.referrer ?? null,
        landing_page: data.landing_page ?? null,
        is_new_visitor: data.is_new_visitor ?? null,
        start_time: data.start_time,
        last_activity: data.last_activity,
        event_count: data.event_count,
        max_scroll_depth: data.max_scroll_depth ?? 0,
        avg_time_on_page: data.avg_time_on_page ?? null,
        metadata: data.metadata ?? null,
        recording_key: data.recording_key ?? null,
      },
      update: {
        last_activity: data.last_activity,
        event_count: data.event_count,
        max_scroll_depth: data.max_scroll_depth,
        avg_time_on_page: data.avg_time_on_page,
        recording_key: data.recording_key,
        updated_at: new Date(),
      },
    });
  }

  public async getSessionSummary(sessionId: string): Promise<SessionSummaryPayload | null> {
    const doc = await this.ss.findUnique({ where: { session_id: sessionId } }) as SessionSummaryRecord | null;
    if (!doc) return null;
    return this.mapSessionSummary(doc);
  }

  public async updateSessionRecording(sessionId: string, recordingKey: string): Promise<void> {
    await this.ss.update({
      where: { session_id: sessionId },
      data: { recording_key: recordingKey, updated_at: new Date() },
    });
  }

  // ─── ANALYTICS READ ───────────────────────────────────────────────────────

  public async listSessions(
    filters: SessionFilters
  ): Promise<{ sessions: SessionSummaryPayload[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filters.from || filters.to) {
      where['last_activity'] = {};
      if (filters.from) (where['last_activity'] as Record<string, unknown>)['gte'] = filters.from;
      if (filters.to) (where['last_activity'] as Record<string, unknown>)['lte'] = filters.to;
    }
    if (filters.country) where['country'] = filters.country;
    if (filters.device) where['device_type'] = filters.device;
    if (filters.browser) where['browser'] = filters.browser;
    if (filters.customerId) where['customer_id'] = filters.customerId;
    if (filters.visitorType) where['is_new_visitor'] = filters.visitorType;
    if (filters.hasRecording === true) where['recording_key'] = { not: null };
    if (filters.hasRecording === false) where['recording_key'] = null;

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;

    const [total, docs] = await Promise.all([
      this.ss.count({ where }),
      this.ss.findMany({
        where,
        orderBy: [{ last_activity: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      sessions: (docs as SessionSummaryRecord[]).map((d) => this.mapSessionSummary(d)),
    };
  }

  public async getSessionJourney(sessionId: string): Promise<SiteVisitPayload[]> {
    const docs = await this.sv.findMany({
      where: { session_id: sessionId },
      orderBy: [{ created_at: 'asc' }],
    }) as SiteVisitRecord[];
    return docs.map((d) => this.mapSiteVisit(d));
  }

  public async getDashboardSummary(range: DateRange): Promise<DashboardSummary> {
    const rangeWhere = { last_activity: { gte: range.from, lte: range.to } };
    const [allSessions, totalEvents, bounceCount, newCount, returningCount, avgDuration] = await Promise.all([
      this.ss.count({ where: rangeWhere }),
      this.ss.findMany({ where: rangeWhere, select: { event_count: true } }).then((rows) =>
        (rows as { event_count: number }[]).reduce((a, r) => a + r.event_count, 0)
      ),
      this.ss.count({ where: { ...rangeWhere, event_count: 1 } }),
      this.ss.count({ where: { ...rangeWhere, is_new_visitor: 'new' } }),
      this.ss.count({ where: { ...rangeWhere, is_new_visitor: 'returning' } }),
      this.ss.groupBy({
        by: ['device_type'],
        where: rangeWhere,
        _avg: { avg_time_on_page: true },
      }).then((rows) => {
        const vals = (rows as { _avg: { avg_time_on_page: number | null } }[])
          .map((r) => r._avg?.avg_time_on_page ?? 0)
          .filter(Boolean);
        return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      }),
      this.sv.count({ where: { created_at: { gte: range.from, lte: range.to }, event_type: 'PAGE_VIEW' } }),
    ]);

    const pvTotal = await this.sv.count({ where: { created_at: { gte: range.from, lte: range.to }, event_type: 'PAGE_VIEW' } });

    return {
      totalSessions: allSessions,
      uniqueVisitors: await this.ss.count({ where: rangeWhere }),
      newVisitors: newCount,
      returningVisitors: returningCount,
      bounceRate: allSessions > 0 ? Math.round((bounceCount / allSessions) * 100) : 0,
      avgSessionDuration: avgDuration,
      totalPageViews: pvTotal,
      totalEvents,
    };
  }

  public async getDeviceBreakdown(
    type: 'device' | 'browser' | 'os',
    range: DateRange
  ): Promise<DeviceBreakdown[]> {
    const field = type === 'device' ? 'device_type' : type === 'browser' ? 'browser' : 'os';
    const rows = await this.ss.groupBy({
      by: [field],
      where: { last_activity: { gte: range.from, lte: range.to } },
      _count: { [field]: true },
      orderBy: [{ _count: { [field]: 'desc' } }],
    });

    const total = (rows as Record<string, unknown>[]).reduce((a, r) => {
      const cnt = (r['_count'] as Record<string, number>)?.[field] ?? 0;
      return a + cnt;
    }, 0);

    return (rows as Record<string, unknown>[]).map((r) => {
      const cnt = (r['_count'] as Record<string, number>)?.[field] ?? 0;
      return {
        dimension: (r[field] as string | null) ?? 'Unknown',
        count: cnt,
        percentage: total > 0 ? Math.round((cnt / total) * 100) : 0,
      };
    });
  }

  public async getTopPages(range: DateRange, limit = 20): Promise<TopPage[]> {
    const rows = await this.sv.groupBy({
      by: ['page_url'],
      where: { created_at: { gte: range.from, lte: range.to }, event_type: 'PAGE_VIEW', NOT: { page_url: null } },
      _count: { page_url: true },
      _avg: { time_on_page: true },
      orderBy: [{ _count: { page_url: 'desc' } }],
    });

    const sliced = (rows as Record<string, unknown>[]).slice(0, limit);
    return sliced.map((r) => ({
      pageUrl: (r['page_url'] as string) ?? '',
      views: (r['_count'] as Record<string, number>)?.['page_url'] ?? 0,
      uniqueSessions: 0, // Prisma groupBy can't easily countDistinct without raw query
      avgTimeOnPage: Math.round(Number((r['_avg'] as Record<string, number | null>)?.['time_on_page'] ?? 0)),
    }));
  }

  public async getFunnelSteps(urls: string[], range: DateRange): Promise<FunnelStep[]> {
    const results: FunnelStep[] = [];
    let firstCount = 0;
    let prevCount = 0;
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const sessions = new Set(
        (await this.sv.findMany({
          where: { created_at: { gte: range.from, lte: range.to }, page_url: { contains: url } },
          select: { session_id: true },
        }) as { session_id: string }[]
      ).map((r) => r.session_id)
      ).size;

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
    const rows = await this.ss.groupBy({
      by: ['utm_source', 'utm_medium', 'utm_campaign'],
      where: { last_activity: { gte: range.from, lte: range.to } },
      _count: { utm_source: true },
      orderBy: [{ _count: { utm_source: 'desc' } }],
    });

    // newVisitors needs a separate count per group — simplified here
    return (rows as Record<string, unknown>[]).slice(0, 50).map((r) => ({
      source: (r['utm_source'] as string | null) ?? null,
      medium: (r['utm_medium'] as string | null) ?? null,
      campaign: (r['utm_campaign'] as string | null) ?? null,
      sessions: (r['_count'] as Record<string, number>)?.['utm_source'] ?? 0,
      newVisitors: 0,
    }));
  }

  public async getActiveVisitorCount(withinSeconds = 300): Promise<number> {
    const since = new Date(Date.now() - withinSeconds * 1000);
    const sessions = await this.sv.findMany({
      where: { created_at: { gte: since } },
      select: { session_id: true },
    }) as { session_id: string }[];
    return new Set(sessions.map((s) => s.session_id)).size;
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
