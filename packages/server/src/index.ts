// ─── Core Types ──────────────────────────────────────────────────────────────
export type {
  EventType,
  VisitorType,
  SiteVisitPayload,
  SiteVisitRecord,
  SessionSummaryPayload,
  DateRange,
  SessionFilters,
  DashboardSummary,
  DeviceBreakdown,
  TopPage,
  FunnelStep,
  UtmBreakdown,
  TrackerStorage,
  TrackerAnalyticsStorage,
  FullTrackerStorage,
  ReplayStorage,
} from './types.js';

// ─── Drizzle Schema (for bring-your-own-schema usage) ────────────────────────
export { siteVisitsTable, sessionSummariesTable } from './schema/drizzle-tables.js';
export type { SiteVisitsTable, SessionSummariesTable } from './schema/drizzle-tables.js';

// ─── Migration Helpers ────────────────────────────────────────────────────────
export { getOmniTrackerSql, runOmniTrackerMigrations } from './schema/migrations.js';
export type { OmniTrackerSql } from './schema/migrations.js';

// ─── Storage Adapters ─────────────────────────────────────────────────────────
export { DrizzleTrackerStorage } from './storage/drizzle.js';
export type { DrizzleTrackerStorageOptions } from './storage/drizzle.js';

export { MemoryTrackerStorage } from './storage/memory.js';

export { MongoTrackerStorage } from './storage/mongodb.js';
export type { MongoTrackerStorageOptions } from './storage/mongodb.js';

export { PrismaTrackerStorage } from './storage/prisma.js';
export type { PrismaTrackerStorageOptions } from './storage/prisma.js';

// ─── Replay Storage Adapters ─────────────────────────────────────────────────
export { S3ReplayStorage } from './replay/s3.js';
export { LocalFileReplayStorage } from './replay/local.js';
export { CloudflareR2ReplayStorage } from './replay/r2.js';
export type { CloudflareR2Config } from './replay/r2.js';

// ─── Bot Filter ───────────────────────────────────────────────────────────────
export { isBot, getUserAgent } from './bot-filter.js';

// ─── Public Tracker Router ────────────────────────────────────────────────────
export { createTrackerRouter } from './router.js';
export type { TrackerRouterConfig } from './router.js';

// ─── Admin Analytics Router ───────────────────────────────────────────────────
export { createAdminRouter } from './admin/router.js';
export type { AdminRouterConfig, AdminRouteKey, AdminRouteConfig, SessionListResult, ExtendedSessionRecord } from './admin/types.js';

// ─── One-Liner Setup ──────────────────────────────────────────────────────────
export { registerOmniTracker } from './register.js';
export type { RegisterOmniTrackerConfig } from './register.js';
