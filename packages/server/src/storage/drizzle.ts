import { sql, and, eq, gte, lte, count, countDistinct, avg, max, desc, inArray } from 'drizzle-orm';
import { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import {
  SiteVisitPayload,
  SessionSummaryPayload,
  TrackerStorage,
  TrackerAnalyticsStorage,
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
import { siteVisitsTable, sessionSummariesTable } from '../schema/drizzle-tables.js';

type AnyPgDb = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export interface DrizzleTrackerStorageOptions {
  /** Override the default site_visits table (bring your own Drizzle table) */
  siteVisitsTable?: typeof siteVisitsTable;
  /** Override the default session_summaries table (bring your own Drizzle table) */
  sessionSummariesTable?: typeof sessionSummariesTable;
}

/**
 * DrizzleTrackerStorage
 *
 * Full-featured Drizzle ORM adapter for PostgreSQL (or any Drizzle-compatible DB).
 * Implements both TrackerStorage (write) and TrackerAnalyticsStorage (read).
 *
 * @example
 * const storage = new DrizzleTrackerStorage(db)
 *
 * // With custom tables (bring-your-own schema)
 * const storage = new DrizzleTrackerStorage(db, {
 *   siteVisitsTable: mySiteVisits,
 *   sessionSummariesTable: mySessionSummaries,
 * })
 */
export class DrizzleTrackerStorage<TDatabase extends { select: Function; insert: Function; update: Function; execute: Function } = AnyPgDb> implements FullTrackerStorage {
  private _db: TDatabase;
  private sv: typeof siteVisitsTable;
  private ss: typeof sessionSummariesTable;

  constructor(db: TDatabase, options?: DrizzleTrackerStorageOptions) {
    this._db = db;
    this.sv = options?.siteVisitsTable ?? siteVisitsTable;
    this.ss = options?.sessionSummariesTable ?? sessionSummariesTable;
  }

  private get db(): AnyPgDb {
    return this._db as never as AnyPgDb;
  }

  // ─── WRITE METHODS ────────────────────────────────────────────────────────

  public async saveSiteVisit(data: SiteVisitPayload): Promise<void> {
    let isNewVisitor: VisitorType | null = null;
    if (data.visitorId && (!data.eventType || data.eventType === 'PAGE_VIEW')) {
      const prev = await this.db
        .select({ id: this.sv.id })
        .from(this.sv)
        .where(and(eq(this.sv.visitor_id, data.visitorId), sql`${this.sv.session_id} != ${data.sessionId}`))
        .limit(1);
      isNewVisitor = prev.length > 0 ? 'returning' : 'new';
    }

    // Deduplicate identical events within 2 seconds
    if (data.sessionId && data.eventType && data.pageUrl) {
      const twoSecondsAgo = new Date(Date.now() - 2000);
      const existing = await this.db
        .select({ id: this.sv.id })
        .from(this.sv)
        .where(
          and(
            eq(this.sv.session_id, data.sessionId),
            eq(this.sv.event_type, data.eventType),
            eq(this.sv.page_url, data.pageUrl),
            sql`${this.sv.created_at} > ${twoSecondsAgo.toISOString()}`
          )
        )
        .limit(1);
      if (existing.length > 0) return;
    }

    const now = new Date();
    await this.db.insert(this.sv).values({
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
      customer_id: data.customerId ? String(data.customerId) : null,
      created_at: now,
      updated_at: now,
    });

    await this.db
      .insert(this.ss)
      .values({
        session_id: data.sessionId,
        visitor_id: data.visitorId ?? null,
        customer_id: data.customerId ? String(data.customerId) : null,
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
        metadata: data.metadata ?? null,
      })
      .onConflictDoUpdate({
        target: this.ss.session_id,
        set: {
          last_activity: now,
          event_count: sql`${this.ss.event_count} + 1`,
          max_scroll_depth: data.scrollDepth
            ? sql`GREATEST(${this.ss.max_scroll_depth}, ${data.scrollDepth})`
            : sql`${this.ss.max_scroll_depth}`,
          customer_id: data.customerId
            ? String(data.customerId)
            : sql`${this.ss.customer_id}`,
          avg_time_on_page: data.timeOnPage
            ? sql`COALESCE((${this.ss.avg_time_on_page} + ${data.timeOnPage}) / 2, ${data.timeOnPage})`
            : sql`${this.ss.avg_time_on_page}`,
          updated_at: now,
        },
      });
  }

  public async saveSessionSummary(data: SessionSummaryPayload): Promise<void> {
    await this.db
      .insert(this.ss)
      .values({
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
      })
      .onConflictDoUpdate({
        target: this.ss.session_id,
        set: {
          last_activity: data.last_activity,
          event_count: data.event_count,
          max_scroll_depth: data.max_scroll_depth ?? sql`${this.ss.max_scroll_depth}`,
          avg_time_on_page: data.avg_time_on_page ?? sql`${this.ss.avg_time_on_page}`,
          recording_key: data.recording_key ?? sql`${this.ss.recording_key}`,
          updated_at: new Date(),
        },
      });
  }

  public async getSessionSummary(sessionId: string): Promise<SessionSummaryPayload | null> {
    const rows = await this.db
      .select()
      .from(this.ss)
      .where(eq(this.ss.session_id, sessionId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      session_id: row.session_id,
      visitor_id: row.visitor_id,
      customer_id: row.customer_id,
      device_type: row.device_type,
      browser: row.browser,
      os: row.os,
      country: row.country,
      ip_address: row.ip_address,
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
      referrer: row.referrer,
      landing_page: row.landing_page,
      is_new_visitor: row.is_new_visitor as VisitorType | null,
      start_time: row.start_time,
      last_activity: row.last_activity,
      event_count: row.event_count,
      max_scroll_depth: row.max_scroll_depth,
      avg_time_on_page: row.avg_time_on_page,
      metadata: row.metadata,
      recording_key: row.recording_key,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public async updateSessionRecording(sessionId: string, recordingKey: string): Promise<void> {
    await this.db
      .update(this.ss)
      .set({ recording_key: recordingKey, updated_at: new Date() })
      .where(eq(this.ss.session_id, sessionId));
  }

  // ─── ANALYTICS READ METHODS ───────────────────────────────────────────────

  public async listSessions(
    filters: SessionFilters
  ): Promise<{ sessions: SessionSummaryPayload[]; total: number }> {
    const {
      from,
      to,
      country,
      device,
      browser,
      customerId,
      visitorType,
      hasRecording,
      page = 1,
      limit = 25,
    } = filters;

    const conditions = [];
    if (from) conditions.push(gte(this.ss.last_activity, from));
    if (to) conditions.push(lte(this.ss.last_activity, to));
    if (country) conditions.push(eq(this.ss.country, country));
    if (device) conditions.push(eq(this.ss.device_type, device));
    if (browser) conditions.push(eq(this.ss.browser, browser));
    if (customerId) conditions.push(eq(this.ss.customer_id, customerId));
    if (visitorType) conditions.push(eq(this.ss.is_new_visitor, visitorType));
    if (hasRecording === true) conditions.push(sql`${this.ss.recording_key} IS NOT NULL`);
    if (hasRecording === false) conditions.push(sql`${this.ss.recording_key} IS NULL`);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow, rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(this.ss)
        .where(where),
      this.db
        .select()
        .from(this.ss)
        .where(where)
        .orderBy(desc(this.ss.last_activity))
        .limit(limit)
        .offset((page - 1) * limit),
    ]);

    return {
      total: totalRow[0]?.total ?? 0,
      sessions: rows.map((row) => ({
        session_id: row.session_id,
        visitor_id: row.visitor_id,
        customer_id: row.customer_id,
        device_type: row.device_type,
        browser: row.browser,
        os: row.os,
        country: row.country,
        ip_address: row.ip_address,
        utm_source: row.utm_source,
        utm_medium: row.utm_medium,
        utm_campaign: row.utm_campaign,
        referrer: row.referrer,
        landing_page: row.landing_page,
        is_new_visitor: row.is_new_visitor as VisitorType | null,
        start_time: row.start_time,
        last_activity: row.last_activity,
        event_count: row.event_count,
        max_scroll_depth: row.max_scroll_depth,
        avg_time_on_page: row.avg_time_on_page,
        metadata: row.metadata,
        recording_key: row.recording_key,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
    };
  }

  public async getSessionJourney(sessionId: string): Promise<SiteVisitPayload[]> {
    const rows = await this.db
      .select()
      .from(this.sv)
      .where(eq(this.sv.session_id, sessionId))
      .orderBy(this.sv.created_at);

    return rows.map((row) => ({
      sessionId: row.session_id,
      visitorId: row.visitor_id,
      deviceType: row.device_type,
      browser: row.browser,
      os: row.os,
      country: row.country,
      ipAddress: row.ip_address,
      utmSource: row.utm_source,
      utmMedium: row.utm_medium,
      utmCampaign: row.utm_campaign,
      utmContent: row.utm_content,
      utmTerm: row.utm_term,
      referrer: row.referrer,
      landingPage: row.landing_page,
      eventType: row.event_type as SiteVisitPayload['eventType'],
      eventLabel: row.event_label,
      pageUrl: row.page_url,
      metadata: row.metadata,
      timeOnPage: row.time_on_page,
      scrollDepth: row.scroll_depth,
      customerId: row.customer_id,
    }));
  }

  public async getDashboardSummary(range: DateRange): Promise<DashboardSummary> {
    const rangeWhere = and(
      gte(this.ss.last_activity, range.from),
      lte(this.ss.last_activity, range.to)
    );

    const [summaryRow] = await this.db
      .select({
        totalSessions: count(),
        uniqueVisitors: countDistinct(this.ss.visitor_id),
        avgDuration: avg(this.ss.avg_time_on_page),
        totalEvents: sql<number>`SUM(${this.ss.event_count})`,
        newCount: sql<number>`COUNT(*) FILTER (WHERE ${this.ss.is_new_visitor} = 'new')`,
        returningCount: sql<number>`COUNT(*) FILTER (WHERE ${this.ss.is_new_visitor} = 'returning')`,
        bounceCount: sql<number>`COUNT(*) FILTER (WHERE ${this.ss.event_count} = 1)`,
      })
      .from(this.ss)
      .where(rangeWhere);

    const [pageViewRow] = await this.db
      .select({ total: count() })
      .from(this.sv)
      .where(
        and(
          gte(this.sv.created_at, range.from),
          lte(this.sv.created_at, range.to),
          eq(this.sv.event_type, 'PAGE_VIEW')
        )
      );

    const totalSessions = summaryRow?.totalSessions ?? 0;
    const bounceCount = Number(summaryRow?.bounceCount ?? 0);

    return {
      totalSessions,
      uniqueVisitors: summaryRow?.uniqueVisitors ?? 0,
      newVisitors: Number(summaryRow?.newCount ?? 0),
      returningVisitors: Number(summaryRow?.returningCount ?? 0),
      bounceRate: totalSessions > 0 ? Math.round((bounceCount / totalSessions) * 100) : 0,
      avgSessionDuration: Math.round(Number(summaryRow?.avgDuration ?? 0)),
      totalPageViews: pageViewRow?.total ?? 0,
      totalEvents: Number(summaryRow?.totalEvents ?? 0),
    };
  }

  public async getDeviceBreakdown(
    type: 'device' | 'browser' | 'os',
    range: DateRange
  ): Promise<DeviceBreakdown[]> {
    const col =
      type === 'device' ? this.ss.device_type
      : type === 'browser' ? this.ss.browser
      : this.ss.os;

    const rangeWhere = and(
      gte(this.ss.last_activity, range.from),
      lte(this.ss.last_activity, range.to)
    );

    const rows = await this.db
      .select({ dimension: col, cnt: count() })
      .from(this.ss)
      .where(rangeWhere)
      .groupBy(col)
      .orderBy(desc(count()));

    const total = rows.reduce((acc, r) => acc + r.cnt, 0);
    return rows.map((r) => ({
      dimension: r.dimension ?? 'Unknown',
      count: r.cnt,
      percentage: total > 0 ? Math.round((r.cnt / total) * 100) : 0,
    }));
  }

  public async getTopPages(range: DateRange, limit = 20): Promise<TopPage[]> {
    const rows = await this.db
      .select({
        pageUrl: this.sv.page_url,
        views: count(),
        uniqueSessions: countDistinct(this.sv.session_id),
        avgTime: avg(this.sv.time_on_page),
      })
      .from(this.sv)
      .where(
        and(
          gte(this.sv.created_at, range.from),
          lte(this.sv.created_at, range.to),
          eq(this.sv.event_type, 'PAGE_VIEW'),
          sql`${this.sv.page_url} IS NOT NULL`
        )
      )
      .groupBy(this.sv.page_url)
      .orderBy(desc(count()))
      .limit(limit);

    return rows.map((r) => ({
      pageUrl: r.pageUrl ?? '',
      views: r.views,
      uniqueSessions: r.uniqueSessions,
      avgTimeOnPage: Math.round(Number(r.avgTime ?? 0)),
    }));
  }

  public async getFunnelSteps(urls: string[], range: DateRange): Promise<FunnelStep[]> {
    if (urls.length === 0) return [];

    const results: FunnelStep[] = [];
    let firstCount = 0;
    let prevCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const [row] = await this.db
        .select({ sessions: countDistinct(this.sv.session_id) })
        .from(this.sv)
        .where(
          and(
            gte(this.sv.created_at, range.from),
            lte(this.sv.created_at, range.to),
            sql`${this.sv.page_url} LIKE ${`%${url}%`}`
          )
        );

      const sessions = row?.sessions ?? 0;
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
    const rows = await this.db
      .select({
        source: this.ss.utm_source,
        medium: this.ss.utm_medium,
        campaign: this.ss.utm_campaign,
        sessions: count(),
        newVisitors: sql<number>`COUNT(*) FILTER (WHERE ${this.ss.is_new_visitor} = 'new')`,
      })
      .from(this.ss)
      .where(
        and(
          gte(this.ss.last_activity, range.from),
          lte(this.ss.last_activity, range.to)
        )
      )
      .groupBy(this.ss.utm_source, this.ss.utm_medium, this.ss.utm_campaign)
      .orderBy(desc(count()))
      .limit(50);

    return rows.map((r) => ({
      source: r.source,
      medium: r.medium,
      campaign: r.campaign,
      sessions: r.sessions,
      newVisitors: Number(r.newVisitors ?? 0),
    }));
  }

  public async getActiveVisitorCount(withinSeconds = 300): Promise<number> {
    const since = new Date(Date.now() - withinSeconds * 1000);
    const [row] = await this.db
      .select({ cnt: countDistinct(this.sv.session_id) })
      .from(this.sv)
      .where(gte(this.sv.created_at, since));
    return row?.cnt ?? 0;
  }
}
