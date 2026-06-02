# Backend Server SDK

The backend server package `@dev-sujay/omnitracker-server` provides Express router endpoints, geo location helpers, and bot filtering utility guards.

---

## `createTrackerRouter` Configuration

Generate the tracking Express router by passing configuration details:

```typescript
import { createTrackerRouter } from '@dev-sujay/omnitracker-server';

const router = createTrackerRouter({
  storage,
  replayStorage,
  resolveCountry,
  rateLimitMiddleware
});
```

| Config Option | Type | Description |
| :--- | :--- | :--- |
| **`storage`** | `TrackerStorage` | Database adapter interface to save site visit events and summaries. |
| **`replayStorage`** | `ReplayStorage` | Storage adapter to upload and load gzip compressed session recordings. |
| **`resolveCountry`** | `(ip: string) => string \| Promise<string>` | Optional callback to locate the country name from client IP (e.g. MaxMind Reader). |
| **`rateLimitMiddleware`** | `ExpressMiddleware` | Optional middleware to rate-limit tracking events. |

---

## Database Tables Setup

You can set up your database tables automatically (if using Drizzle ORM) or manually (using raw SQL).

### Method A: Automated Setup (Drizzle ORM)
If you are using Drizzle ORM in your backend project, you do not need to write SQL. Simply import the schemas from `@dev-sujay/omnitracker-server` and register them in your database schema file:

1. Import and export the tables in your Drizzle schema entry point (e.g. `src/db/schema.ts`):
   ```typescript
   export { siteVisitsSchema, sessionSummariesSchema } from '@dev-sujay/omnitracker-server';
   ```

2. Run Drizzle Kit to automatically generate and execute migrations:
   ```bash
   npx drizzle-kit generate:pg
   npx drizzle-kit push:pg
   ```
   Drizzle will automatically detect the tables and create them in PostgreSQL with the correct columns, indexes, and constraints.

---

### Method B: Manual Setup (Raw SQL / Other ORMs)
If you are using another ORM (like Prisma or Knex) or writing raw SQL queries, you can run our PostgreSQL migration script manually.

1. Locate the migration file at: [`packages/server/migration.sql`](file:///C:/Users/HP/Desktop/TLH/Tracking/packages/server/migration.sql)
2. Run the following query in your database manager (pgAdmin, psql, DBeaver):

```sql
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

CREATE INDEX IF NOT EXISTS "session_summaries_last_activity_idx" ON "session_summaries" ("last_activity");
```

---

## Bot Filtering

Every incoming tracking event user-agent is evaluated against standard bot, crawler, and uptime monitoring regex patterns.

* If a bot is detected, the server returns status `200` immediately and discards the log from writing to the database to keep analytics clean.
* Suspect and short User-Agent headers are filtered automatically.

---

## Endpoints Registered

The router automatically configures the following routes:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **`POST`** | `/track-site-visit` | Receives client visits, scroll metrics, clicks, and page exit page time data. |
| **`POST`** | `/session-replay/:sessionId` | Receives binary gzip octet-stream session recording chunks. |
| **`GET`** | `/session-replay/:sessionId` | Lists chunk keys associated with a recording. |
| **`GET`** | `/session-replay/chunk` | Streams a specific chunk, decompressed (`gunzipped`) on-the-fly. |
