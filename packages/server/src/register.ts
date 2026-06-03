import { Express, Router } from 'express';
import { createTrackerRouter, TrackerRouterConfig } from './router.js';
import { createAdminRouter } from './admin/router.js';
import { AdminRouterConfig } from './admin/types.js';
import { FullTrackerStorage } from './types.js';
import { ReplayStorage } from './types.js';

export interface RegisterOmniTrackerConfig extends TrackerRouterConfig {
  /**
   * Storage adapter. Must implement FullTrackerStorage (both write + read).
   * Built-in adapters: DrizzleTrackerStorage, MemoryTrackerStorage,
   *                    MongoTrackerStorage, PrismaTrackerStorage
   */
  storage: FullTrackerStorage;
  /** Optional replay storage adapter */
  replayStorage?: ReplayStorage;
  /**
   * Admin analytics routes configuration.
   * If omitted, admin routes are NOT mounted.
   */
  adminRoutes?: {
    /**
     * URL prefix for all admin routes.
     * @default '/omnitracker/admin'
     */
    prefix?: string;
    /**
     * Middleware applied to ALL admin routes (auth, logging, etc.)
     * @example
     * globalMiddleware: [jwtMiddleware]
     */
    globalMiddleware?: AdminRouterConfig['globalMiddleware'];
    /**
     * Per-route middleware config with full AdminRouteKey autocomplete.
     * @example
     * routes: {
     *   sessions: { middleware: [PermissionMiddleware.check('analytics', 'read')] },
     *   live:     { disabled: true },
     * }
     */
    routes?: AdminRouterConfig['routes'];

    // E-commerce callback resolvers
    resolveCustomerInfo?: AdminRouterConfig['resolveCustomerInfo'];
    getSessionIdFromOrderId?: AdminRouterConfig['getSessionIdFromOrderId'];
    resolveSessions?: AdminRouterConfig['resolveSessions'];
    exportSessions?: AdminRouterConfig['exportSessions'];
  };
  /**
   * URL prefix for the public tracker events router.
   * @default '/'
   */
  trackerPrefix?: string;
}

/**
 * registerOmniTracker
 *
 * One-liner to mount the full OmniTracker stack on your Express app or Router.
 * This replaces all custom analytics route code in your app.
 */
export function registerOmniTracker(app: Express | Router, config: RegisterOmniTrackerConfig): void {
  const {
    storage,
    replayStorage,
    resolveCountry,
    rateLimitMiddleware,
    trackingAuthMiddleware,
    replayAuthMiddleware,
    enrichCustomerId,
    trackerPrefix = '/',
    adminRoutes,
  } = config;

  // 1. Mount public event-tracking router
  const trackerRouter = createTrackerRouter({
    storage,
    replayStorage,
    resolveCountry,
    rateLimitMiddleware,
    trackingAuthMiddleware,
    replayAuthMiddleware,
    enrichCustomerId,
  });
  (app as Router).use(trackerPrefix, trackerRouter);

  // 2. Mount admin analytics router (optional)
  if (adminRoutes) {
    const prefix = adminRoutes.prefix ?? '/omnitracker/admin';
    const adminRouter = createAdminRouter({
      storage,
      replayStorage,
      globalMiddleware: adminRoutes.globalMiddleware,
      routes: adminRoutes.routes,
      resolveCustomerInfo: adminRoutes.resolveCustomerInfo,
      getSessionIdFromOrderId: adminRoutes.getSessionIdFromOrderId,
      resolveSessions: adminRoutes.resolveSessions,
      exportSessions: adminRoutes.exportSessions,
    });
    (app as Router).use(prefix, adminRouter);
  }
}
