-- SQL Migration Script for OmniTracker Database Tables (PostgreSQL)

-- 1. Create table for site visit events
CREATE TABLE IF NOT EXISTS "site_visits" (
  "id" SERIAL PRIMARY KEY,
  "session_id" TEXT NOT NULL,
  "visitor_id" TEXT,
  "device_type" VARCHAR(50),
  "browser" VARCHAR(100),
  "os" VARCHAR(100),
  "country" VARCHAR(100),
  "ip_address" VARCHAR(45),
  "utm_source" VARCHAR(255),
  "utm_medium" VARCHAR(255),
  "utm_campaign" VARCHAR(255),
  "utm_content" VARCHAR(255),
  "utm_term" VARCHAR(255),
  "referrer" TEXT,
  "landing_page" TEXT,
  "event_type" VARCHAR(50) DEFAULT 'PAGE_VIEW',
  "event_label" TEXT,
  "page_url" TEXT,
  "metadata" TEXT,
  "time_on_page" INTEGER,
  "scroll_depth" INTEGER,
  "is_new_visitor" TEXT,
  "customer_id" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS "site_visits_session_idx" ON "site_visits" ("session_id");
CREATE INDEX IF NOT EXISTS "site_visits_visitor_idx" ON "site_visits" ("visitor_id");
CREATE INDEX IF NOT EXISTS "site_visits_created_at_idx" ON "site_visits" ("created_at");

-- 2. Create table for session summaries
CREATE TABLE IF NOT EXISTS "session_summaries" (
  "session_id" TEXT PRIMARY KEY,
  "visitor_id" TEXT,
  "customer_id" TEXT,
  "device_type" VARCHAR(50),
  "browser" VARCHAR(100),
  "os" VARCHAR(100),
  "country" VARCHAR(100),
  "ip_address" VARCHAR(45),
  "utm_source" VARCHAR(255),
  "utm_medium" VARCHAR(255),
  "utm_campaign" VARCHAR(255),
  "referrer" TEXT,
  "landing_page" TEXT,
  "is_new_visitor" TEXT,
  "start_time" TIMESTAMP NOT NULL,
  "last_activity" TIMESTAMP NOT NULL,
  "event_count" INTEGER NOT NULL DEFAULT 1,
  "max_scroll_depth" INTEGER DEFAULT 0,
  "avg_time_on_page" INTEGER,
  "metadata" TEXT,
  "recording_key" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS "session_summaries_last_activity_idx" ON "session_summaries" ("last_activity");
