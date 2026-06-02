/**
 * OmniTracker Migration Helpers
 *
 * Use these helpers to create the required tables in your database.
 *
 * With Drizzle (recommended):
 *   import { siteVisitsTable, sessionSummariesTable } from '@dev-sujay/omnitracker-server/schema'
 *   // Add them to your drizzle schema and run: drizzle-kit generate
 *
 * Manual SQL (any DB):
 *   import { getOmniTrackerSql } from '@dev-sujay/omnitracker-server'
 *   const { up, down } = getOmniTrackerSql()
 *
 * Programmatic (Drizzle client):
 *   import { runOmniTrackerMigrations } from '@dev-sujay/omnitracker-server'
 *   await runOmniTrackerMigrations(db)
 */

export interface OmniTrackerSql {
  /** SQL to CREATE the two required tables */
  up: string;
  /** SQL to DROP the two tables */
  down: string;
}

/**
 * Returns raw SQL strings for the OmniTracker tables.
 * Use this if you manage migrations manually (Flyway, Liquibase, raw SQL files, etc.)
 */
export function getOmniTrackerSql(): OmniTrackerSql {
  const up = /* sql */`
-- OmniTracker: site_visits table
CREATE TABLE IF NOT EXISTS "site_visits" (
  "id"            SERIAL PRIMARY KEY,
  "session_id"    TEXT NOT NULL,
  "visitor_id"    TEXT,
  "device_type"   VARCHAR(50),
  "browser"       VARCHAR(100),
  "os"            VARCHAR(100),
  "country"       VARCHAR(100),
  "ip_address"    VARCHAR(45),
  "utm_source"    VARCHAR(255),
  "utm_medium"    VARCHAR(255),
  "utm_campaign"  VARCHAR(255),
  "utm_content"   VARCHAR(255),
  "utm_term"      VARCHAR(255),
  "referrer"      TEXT,
  "landing_page"  TEXT,
  "event_type"    VARCHAR(50) DEFAULT 'PAGE_VIEW',
  "event_label"   TEXT,
  "page_url"      TEXT,
  "metadata"      TEXT,
  "time_on_page"  INTEGER,
  "scroll_depth"  INTEGER,
  "is_new_visitor" TEXT,
  "customer_id"   TEXT,
  "created_at"    TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "site_visits_session_idx"    ON "site_visits"("session_id");
CREATE INDEX IF NOT EXISTS "site_visits_visitor_idx"    ON "site_visits"("visitor_id");
CREATE INDEX IF NOT EXISTS "site_visits_created_at_idx" ON "site_visits"("created_at");
CREATE INDEX IF NOT EXISTS "site_visits_event_type_idx" ON "site_visits"("event_type");
CREATE INDEX IF NOT EXISTS "site_visits_page_url_idx"   ON "site_visits"("page_url");

-- OmniTracker: session_summaries table
CREATE TABLE IF NOT EXISTS "session_summaries" (
  "session_id"      TEXT PRIMARY KEY,
  "visitor_id"      TEXT,
  "customer_id"     TEXT,
  "device_type"     VARCHAR(50),
  "browser"         VARCHAR(100),
  "os"              VARCHAR(100),
  "country"         VARCHAR(100),
  "ip_address"      VARCHAR(45),
  "utm_source"      VARCHAR(255),
  "utm_medium"      VARCHAR(255),
  "utm_campaign"    VARCHAR(255),
  "referrer"        TEXT,
  "landing_page"    TEXT,
  "is_new_visitor"  TEXT,
  "start_time"      TIMESTAMP NOT NULL,
  "last_activity"   TIMESTAMP NOT NULL,
  "event_count"     INTEGER NOT NULL DEFAULT 1,
  "max_scroll_depth" INTEGER DEFAULT 0,
  "avg_time_on_page" INTEGER,
  "metadata"        TEXT,
  "recording_key"   TEXT,
  "created_at"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "session_summaries_last_activity_idx" ON "session_summaries"("last_activity");
CREATE INDEX IF NOT EXISTS "session_summaries_visitor_idx"       ON "session_summaries"("visitor_id");
CREATE INDEX IF NOT EXISTS "session_summaries_customer_idx"      ON "session_summaries"("customer_id");
CREATE INDEX IF NOT EXISTS "session_summaries_country_idx"       ON "session_summaries"("country");
CREATE INDEX IF NOT EXISTS "session_summaries_device_idx"        ON "session_summaries"("device_type");
`.trim();

  const down = /* sql */`
DROP TABLE IF EXISTS "site_visits";
DROP TABLE IF EXISTS "session_summaries";
`.trim();

  return { up, down };
}

/**
 * Programmatically runs the OmniTracker migration against a raw pg/postgres client.
 * Accepts anything with an `.query(sql: string)` method (node-postgres, postgres.js, etc.)
 */
export async function runOmniTrackerMigrations(
  client: { query(sql: string): Promise<unknown> }
): Promise<void> {
  const { up } = getOmniTrackerSql();
  await client.query(up);
}
