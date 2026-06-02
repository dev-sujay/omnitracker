import { Express } from 'express';
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
 * One-liner to mount the full OmniTracker stack on your Express app.
 * This replaces all custom analytics route code in your app.
 *
 * @example
 * import { registerOmniTracker, DrizzleTrackerStorage, S3ReplayStorage } from '@dev-sujay/omnitracker-server'
 *
 * registerOmniTracker(app, {
 *   storage: new DrizzleTrackerStorage(db),
 *   replayStorage: new S3ReplayStorage({ bucket: process.env.AWS_S3_BUCKET! }),
 *   resolveCountry: (ip) => getLocationFromIP(ip),
 *   rateLimitMiddleware: trackingLimiter,
 *   adminRoutes: {
 *     prefix: '/admin/analytics',
 *     globalMiddleware: [jwtMiddleware],
 *     routes: {
 *       sessions:      { middleware: [PermissionMiddleware.check('analytics', 'read')] },
 *       summary:       { middleware: [PermissionMiddleware.check('analytics', 'read')] },
 *       devices:       { middleware: [PermissionMiddleware.check('analytics', 'read')] },
 *       topPages:      { middleware: [PermissionMiddleware.check('analytics', 'read')] },
 *       funnel:        { middleware: [PermissionMiddleware.check('analytics', 'read')] },
 *       utm:           { middleware: [PermissionMiddleware.check('analytics', 'read')] },
 *       live:          { middleware: [PermissionMiddleware.check('analytics', 'read')] },
 *       sessionJourney:{ middleware: [PermissionMiddleware.check('analytics', 'read')] },
 *       sessionReplay: { middleware: [PermissionMiddleware.check('analytics', 'read')] },
 *     },
 *   },
 * })
 */
export function registerOmniTracker(app: Express, config: RegisterOmniTrackerConfig): void {
  const {
    storage,
    replayStorage,
    resolveCountry,
    rateLimitMiddleware,
    trackerPrefix = '/',
    adminRoutes,
  } = config;

  // 1. Mount public event-tracking router
  const trackerRouter = createTrackerRouter({
    storage,
    replayStorage,
    resolveCountry,
    rateLimitMiddleware,
  });
  app.use(trackerPrefix, trackerRouter);

  // 2. Mount admin analytics router (optional)
  if (adminRoutes) {
    const prefix = adminRoutes.prefix ?? '/omnitracker/admin';
    const adminRouter = createAdminRouter({
      storage,
      replayStorage,
      globalMiddleware: adminRoutes.globalMiddleware,
      routes: adminRoutes.routes,
    });
    app.use(prefix, adminRouter);
  }
}
