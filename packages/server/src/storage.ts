import { sql, and, eq } from 'drizzle-orm';
import { PgDatabase } from 'drizzle-orm/pg-core';
import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

// ─── 1. PAYLOAD SCHEMAS ──────────────────────────────────────────────────────
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
  eventType?: 'PAGE_VIEW' | 'CLICK' | 'PAGE_EXIT' | 'SCROLL' | 'RAGE_CLICK' | 'CUSTOM' | null;
  eventLabel?: string | null;
  pageUrl?: string | null;
  metadata?: string | null;
  timeOnPage?: number | null;
  scrollDepth?: number | null;
  customerId?: string | null;
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
  is_new_visitor?: 'new' | 'returning' | null;
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

// ─── 2. STORAGE INTERFACE ────────────────────────────────────────────────────
export interface TrackerStorage {
  saveSiteVisit(data: SiteVisitPayload): Promise<void>;
  saveSessionSummary(data: SessionSummaryPayload): Promise<void>;
  getSessionSummary(sessionId: string): Promise<SessionSummaryPayload | null>;
  updateSessionRecording(sessionId: string, recordingKey: string): Promise<void>;
}

// ─── 3. DRIZZLE SCHEMA DEFINITIONS ───────────────────────────────────────────
export const siteVisitsSchema = pgTable(
  'site_visits',
  {
    id: serial('id').primaryKey(),
    session_id: text('session_id').notNull(),
    visitor_id: text('visitor_id'),
    device_type: varchar('device_type', { length: 50 }),
    browser: varchar('browser', { length: 100 }),
    os: varchar('os', { length: 100 }),
    country: varchar('country', { length: 100 }),
    ip_address: varchar('ip_address', { length: 45 }),
    utm_source: varchar('utm_source', { length: 255 }),
    utm_medium: varchar('utm_medium', { length: 255 }),
    utm_campaign: varchar('utm_campaign', { length: 255 }),
    utm_content: varchar('utm_content', { length: 255 }),
    utm_term: varchar('utm_term', { length: 255 }),
    referrer: text('referrer'),
    landing_page: text('landing_page'),
    event_type: varchar('event_type', { length: 50 }).default('PAGE_VIEW'),
    event_label: text('event_label'),
    page_url: text('page_url'),
    metadata: text('metadata'),
    time_on_page: integer('time_on_page'),
    scroll_depth: integer('scroll_depth'),
    is_new_visitor: text('is_new_visitor'),
    customer_id: text('customer_id'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    session_idx: index('site_visits_session_idx').on(table.session_id),
    visitor_idx: index('site_visits_visitor_idx').on(table.visitor_id),
    created_at_idx: index('site_visits_created_at_idx').on(table.created_at),
  })
);

export const sessionSummariesSchema = pgTable(
  'session_summaries',
  {
    session_id: text('session_id').primaryKey(),
    visitor_id: text('visitor_id'),
    customer_id: text('customer_id'),
    device_type: varchar('device_type', { length: 50 }),
    browser: varchar('browser', { length: 100 }),
    os: varchar('os', { length: 100 }),
    country: varchar('country', { length: 100 }),
    ip_address: varchar('ip_address', { length: 45 }),
    utm_source: varchar('utm_source', { length: 255 }),
    utm_medium: varchar('utm_medium', { length: 255 }),
    utm_campaign: varchar('utm_campaign', { length: 255 }),
    referrer: text('referrer'),
    landing_page: text('landing_page'),
    is_new_visitor: text('is_new_visitor'),
    start_time: timestamp('start_time').notNull(),
    last_activity: timestamp('last_activity').notNull(),
    event_count: integer('event_count').default(1).notNull(),
    max_scroll_depth: integer('max_scroll_depth').default(0),
    avg_time_on_page: integer('avg_time_on_page'),
    metadata: text('metadata'),
    recording_key: text('recording_key'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    last_activity_idx: index('session_summaries_last_activity_idx').on(table.last_activity),
  })
);

// ─── 4. DRIZZLE STORAGE ADAPTER ──────────────────────────────────────────────
export class DrizzleTrackerStorage<
  TQueryResult extends import('drizzle-orm/pg-core').QueryResultHKT = import('drizzle-orm/pg-core').QueryResultHKT,
  TSchema extends Record<string, unknown> = Record<string, unknown>
> implements TrackerStorage {
  private db: PgDatabase<TQueryResult, TSchema>;
  private siteVisitsTable: typeof siteVisitsSchema;
  private sessionSummariesTable: typeof sessionSummariesSchema;

  constructor(
    db: PgDatabase<TQueryResult, TSchema>,
    options?: { siteVisitsTable?: typeof siteVisitsSchema; sessionSummariesTable?: typeof sessionSummariesSchema }
  ) {
    this.db = db;
    this.siteVisitsTable = options?.siteVisitsTable ?? siteVisitsSchema;
    this.sessionSummariesTable = options?.sessionSummariesTable ?? sessionSummariesSchema;
  }

  public async saveSiteVisit(data: SiteVisitPayload): Promise<void> {
    let isNewVisitor: 'new' | 'returning' | null = null;
    if (data.visitorId && (!data.eventType || data.eventType === 'PAGE_VIEW')) {
      const previousSession = await this.db
        .select({ id: this.siteVisitsTable.id })
        .from(this.siteVisitsTable)
        .where(
          and(
            eq(this.siteVisitsTable.visitor_id, data.visitorId),
            sql`${this.siteVisitsTable.session_id} != ${data.sessionId}`
          )
        )
        .limit(1);

      isNewVisitor = previousSession.length > 0 ? 'returning' : 'new';
    }

    if (data.sessionId && data.eventType && data.pageUrl) {
      const twoSecondsAgo = new Date(Date.now() - 2000);
      const existing = await this.db
        .select({ id: this.siteVisitsTable.id })
        .from(this.siteVisitsTable)
        .where(
          and(
            eq(this.siteVisitsTable.session_id, data.sessionId),
            eq(this.siteVisitsTable.event_type, data.eventType),
            eq(this.siteVisitsTable.page_url, data.pageUrl),
            sql`${this.siteVisitsTable.created_at} > ${twoSecondsAgo.toISOString()}`
          )
        )
        .limit(1);

      if (existing.length > 0) return;
    }

    await this.db.insert(this.siteVisitsTable).values({
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
      event_type: data.eventType || 'PAGE_VIEW',
      event_label: data.eventLabel ?? null,
      page_url: data.pageUrl ?? null,
      metadata: data.metadata ?? null,
      time_on_page: data.timeOnPage ?? null,
      scroll_depth: data.scrollDepth ?? null,
      is_new_visitor: isNewVisitor,
      customer_id: data.customerId ? String(data.customerId) : null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await this.db
      .insert(this.sessionSummariesTable)
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
        start_time: new Date(),
        last_activity: new Date(),
        event_count: 1,
        max_scroll_depth: data.scrollDepth ?? 0,
        avg_time_on_page: data.timeOnPage ?? null,
        metadata: data.metadata ?? null,
      })
      .onConflictDoUpdate({
        target: this.sessionSummariesTable.session_id,
        set: {
          last_activity: new Date(),
          event_count: sql`${this.sessionSummariesTable.event_count} + 1`,
          max_scroll_depth: data.scrollDepth
            ? sql`GREATEST(${this.sessionSummariesTable.max_scroll_depth}, ${data.scrollDepth})`
            : sql`${this.sessionSummariesTable.max_scroll_depth}`,
          customer_id: data.customerId
            ? String(data.customerId)
            : sql`${this.sessionSummariesTable.customer_id}`,
          avg_time_on_page: data.timeOnPage
            ? sql`COALESCE((${this.sessionSummariesTable.avg_time_on_page} + ${data.timeOnPage}) / 2, ${data.timeOnPage})`
            : sql`${this.sessionSummariesTable.avg_time_on_page}`,
          updated_at: new Date(),
        },
      });
  }

  public async saveSessionSummary(data: SessionSummaryPayload): Promise<void> {
    await this.db
      .insert(this.sessionSummariesTable)
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
        target: this.sessionSummariesTable.session_id,
        set: {
          last_activity: data.last_activity,
          event_count: data.event_count,
          max_scroll_depth: data.max_scroll_depth ?? sql`${this.sessionSummariesTable.max_scroll_depth}`,
          avg_time_on_page: data.avg_time_on_page ?? sql`${this.sessionSummariesTable.avg_time_on_page}`,
          recording_key: data.recording_key ?? sql`${this.sessionSummariesTable.recording_key}`,
          updated_at: new Date(),
        },
      });
  }

  public async getSessionSummary(sessionId: string): Promise<SessionSummaryPayload | null> {
    const results = await this.db
      .select()
      .from(this.sessionSummariesTable)
      .where(eq(this.sessionSummariesTable.session_id, sessionId))
      .limit(1);
    
    if (!results[0]) return null;

    const row = results[0];
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
      is_new_visitor: row.is_new_visitor as 'new' | 'returning' | null,
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
      .update(this.sessionSummariesTable)
      .set({ recording_key: recordingKey, updated_at: new Date() })
      .where(eq(this.sessionSummariesTable.session_id, sessionId));
  }
}

// ─── 5. MEMORY STORAGE (FOR TESTING/ZERO-SETUP OUT OF THE BOX) ───────────────
export class MemoryTrackerStorage implements TrackerStorage {
  private visits: SiteVisitPayload[] = [];
  private summaries: Map<string, SessionSummaryPayload> = new Map();

  public async saveSiteVisit(data: SiteVisitPayload): Promise<void> {
    const now = new Date();
    const visit = {
      ...data,
      created_at: now,
      updated_at: now,
    };
    this.visits.push(visit);

    let summary = this.summaries.get(data.sessionId);
    if (!summary) {
      summary = {
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
      };
    } else {
      summary.last_activity = now;
      summary.event_count += 1;
      if (data.scrollDepth) {
        summary.max_scroll_depth = Math.max(summary.max_scroll_depth ?? 0, data.scrollDepth);
      }
      if (data.customerId) {
        summary.customer_id = data.customerId;
      }
      if (data.timeOnPage) {
        summary.avg_time_on_page = summary.avg_time_on_page
          ? Math.round((summary.avg_time_on_page + data.timeOnPage) / 2)
          : data.timeOnPage;
      }
      summary.updated_at = now;
    }
    this.summaries.set(data.sessionId, summary);
  }

  public async saveSessionSummary(data: SessionSummaryPayload): Promise<void> {
    this.summaries.set(data.session_id, {
      ...data,
      updated_at: new Date(),
    });
  }

  public async getSessionSummary(sessionId: string): Promise<SessionSummaryPayload | null> {
    return this.summaries.get(sessionId) || null;
  }

  public async updateSessionRecording(sessionId: string, recordingKey: string): Promise<void> {
    const summary = this.summaries.get(sessionId);
    if (summary) {
      summary.recording_key = recordingKey;
      summary.updated_at = new Date();
      this.summaries.set(sessionId, summary);
    }
  }

  public getVisits(): SiteVisitPayload[] {
    return this.visits;
  }
}
