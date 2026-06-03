import { RequestHandler } from 'express';
import { TrackerAnalyticsStorage, ReplayStorage, SessionSummaryPayload } from '../types.js';

export interface ExtendedSessionRecord extends SessionSummaryPayload {
  customer_name?: string | null;
  customer_email?: string | null;
  customer_avatar?: string | null;
  customer_phone?: string | null;
  order_id?: number | null;
  order_status?: string | null;
  order_total?: string | null;
}

export interface SessionListResult {
  result: ExtendedSessionRecord[];
  total_count?: number;
  counts?: {
    all: number;
    converted: number;
    nonConverted: number;
    loggedIn: number;
  };
}

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
  | 'live'             // GET  /live               — SSE active visitor count stream
  | 'journey'          // GET  /journey/:sessionId — compatibility journey route
  | 'journeyByOrder'   // GET  /journey/order/:orderId — compatibility order journey route
  | 'exportSessions';  // GET  /sessions/export    — compatibility sessions export route

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
  /** Resolves customer details (email, name) given a customerId string from the site visit */
  resolveCustomerInfo?: (customerId: string) => Promise<{ email: string | null; name: string | null } | null>;
  /** Resolves sessionId string given an orderId number */
  getSessionIdFromOrderId?: (orderId: number) => Promise<string | null>;
  /** Exports sessions to CSV based on filters */
  exportSessions?: (filters: { startDate?: string; endDate?: string; searchTerm?: string; isConverted?: boolean; isLoggedIn?: boolean }) => Promise<string>;
  /** Custom session lister to fetch sessions with e-commerce properties, custom search, and pagination */
  resolveSessions?: (filters: {
    startDate?: string;
    endDate?: string;
    searchTerm?: string;
    isConverted?: boolean;
    isLoggedIn?: boolean;
    page: number;
    limit: number;
  }) => Promise<SessionListResult>;
}
