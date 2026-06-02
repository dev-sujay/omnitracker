import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

/**
 * site_visits — one row per tracked event (PAGE_VIEW, CLICK, etc.)
 * Export and use this in your Drizzle schema if you want to bring your own DB.
 */
export const siteVisitsTable = pgTable(
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
    event_type_idx: index('site_visits_event_type_idx').on(table.event_type),
    page_url_idx: index('site_visits_page_url_idx').on(table.page_url),
  })
);

/**
 * session_summaries — one row per user session, upserted on every event.
 * Export and use this in your Drizzle schema if you want to bring your own DB.
 */
export const sessionSummariesTable = pgTable(
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
    visitor_idx: index('session_summaries_visitor_idx').on(table.visitor_id),
    customer_idx: index('session_summaries_customer_idx').on(table.customer_id),
    country_idx: index('session_summaries_country_idx').on(table.country),
    device_idx: index('session_summaries_device_idx').on(table.device_type),
  })
);

export type SiteVisitsTable = typeof siteVisitsTable;
export type SessionSummariesTable = typeof sessionSummariesTable;
