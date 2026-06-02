import { RequestHandler } from 'express';
import { TrackerAnalyticsStorage } from '../types.js';
import { ReplayStorage } from '../types.js';

/**
 * All available admin route identifiers.
 * Use these as keys in AdminRouterConfig.routes for per-route middleware.
 *
 * IDE autocomplete will suggest all valid keys. ✅
 */
export type AdminRouteKey =
  | 'sessions'         // GET  /sessions          — paginated session list
  | 'sessionJourney'   // GET  /sessions/:id/journey — full page journey
  | 'sessionReplay'    // GET  /sessions/:id/replay  — replay chunk list
  | 'summary'          // GET  /summary            — dashboard KPIs
  | 'devices'          // GET  /devices            — device/browser/os breakdown
  | 'topPages'         // GET  /top-pages          — top N pages by views
  | 'funnel'           // GET  /funnel             — funnel conversion steps
  | 'utm'              // GET  /utm                — UTM channel breakdown
  | 'live';            // GET  /live               — SSE active visitor count stream

export interface AdminRouteConfig {
  /**
   * Middleware to run for this specific route (after globalMiddleware).
   * @example
   * { middleware: [authMiddleware, PermissionMiddleware.check('analytics', 'read')] }
   */
  middleware?: RequestHandler[];
  /** Set to true to disable this route entirely */
  disabled?: boolean;
}

export interface AdminRouterConfig {
  /** Storage adapter that implements TrackerAnalyticsStorage */
  storage: TrackerAnalyticsStorage;
  /** Optional replay storage for serving session replay chunk lists */
  replayStorage?: ReplayStorage;
  /**
   * Middleware applied to ALL admin routes (before route-specific middleware).
   * Ideal for auth guards, logging, etc.
   * @example
   * globalMiddleware: [jwtMiddleware]
   */
  globalMiddleware?: RequestHandler[];
  /**
   * Per-route middleware configuration.
   * All keys are typed as AdminRouteKey — get full IDE autocomplete.
   * @example
   * routes: {
   *   sessions: { middleware: [PermissionMiddleware.check('analytics', 'read')] },
   *   live:     { middleware: [PermissionMiddleware.check('analytics', 'read')] },
   *   funnel:   { disabled: true }, // turn off this route
   * }
   */
  routes?: Partial<Record<AdminRouteKey, AdminRouteConfig>>;
}
