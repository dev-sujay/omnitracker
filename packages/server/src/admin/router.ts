import { Router, Request, Response, RequestHandler } from 'express';
import { AdminRouterConfig, AdminRouteKey } from './types.js';

/**
 * createAdminRouter
 *
 * Creates a fully-featured Express router exposing analytics query endpoints
 * for building admin dashboards.
 *
 * All routes are protected by `globalMiddleware` plus optional per-route middleware.
 *
 * @example
 * const adminRouter = createAdminRouter({
 *   storage: new DrizzleTrackerStorage(db),
 *   globalMiddleware: [jwtAuthMiddleware],
 *   routes: {
 *     sessions:      { middleware: [PermissionMiddleware.check('analytics', 'read')] },
 *     live:          { middleware: [PermissionMiddleware.check('analytics', 'read')] },
 *     sessionReplay: { middleware: [PermissionMiddleware.check('analytics', 'read')] },
 *   },
 * })
 *
 * app.use('/admin/analytics', adminRouter)
 *
 * Exposed endpoints:
 *   GET /sessions                     — paginated session list
 *   GET /sessions/:sessionId/journey  — page-by-page journey
 *   GET /sessions/:sessionId/replay   — replay chunk list
 *   GET /summary                      — dashboard KPIs
 *   GET /devices                      — device/browser/OS breakdown
 *   GET /top-pages                    — top pages by view count
 *   GET /funnel                       — funnel conversion steps
 *   GET /utm                          — UTM channel breakdown
 *   GET /live                         — SSE active visitor stream
 */
export function createAdminRouter(config: AdminRouterConfig): Router {
  const router = Router();
  const { storage, replayStorage, globalMiddleware = [], routes = {} } = config;

  /** Resolves the middleware chain for a given route key */
  function mw(key: AdminRouteKey): RequestHandler[] {
    const routeCfg = routes[key];
    return [...globalMiddleware, ...(routeCfg?.middleware ?? [])];
  }

  /** Returns true if this route should be registered */
  function isEnabled(key: AdminRouteKey): boolean {
    return routes[key]?.disabled !== true;
  }

  // ─── GET /sessions ─────────────────────────────────────────────────────────
  if (isEnabled('sessions')) {
    router.get('/sessions', ...mw('sessions'), async (req: Request, res: Response): Promise<Response> => {
      try {
        const { from, to, country, device, browser, customerId, visitorType, hasRecording, page, limit, search } = req.query;

        const result = await storage.listSessions({
          from: from ? new Date(from as string) : undefined,
          to: to ? new Date(to as string) : undefined,
          country: country as string | undefined,
          device: device as string | undefined,
          browser: browser as string | undefined,
          customerId: customerId as string | undefined,
          visitorType: visitorType as 'new' | 'returning' | undefined,
          hasRecording: hasRecording === 'true' ? true : hasRecording === 'false' ? false : undefined,
          search: search as string | undefined,
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? Math.min(parseInt(limit as string, 10), 100) : 25,
        });

        return res.json({ success: true, data: result });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /sessions error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
      }
    });
  }

  // ─── GET /sessions/:sessionId/journey ─────────────────────────────────────
  if (isEnabled('sessionJourney')) {
    router.get('/sessions/:sessionId/journey', ...mw('sessionJourney'), async (req: Request, res: Response): Promise<Response> => {
      try {
        const { sessionId } = req.params;
        const journey = await storage.getSessionJourney(sessionId);
        return res.json({ success: true, data: journey });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /sessions/:id/journey error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch session journey' });
      }
    });
  }

  // ─── GET /sessions/:sessionId/replay ──────────────────────────────────────
  if (isEnabled('sessionReplay')) {
    router.get('/sessions/:sessionId/replay', ...mw('sessionReplay'), async (req: Request, res: Response): Promise<Response> => {
      try {
        if (!replayStorage) {
          return res.status(501).json({ success: false, error: 'Replay storage is not configured' });
        }
        const { sessionId } = req.params;
        const summary = await storage.getSessionSummary(sessionId);
        if (!summary?.recording_key) {
          return res.status(404).json({ success: false, error: 'No recording found for this session' });
        }
        const chunks = await replayStorage.listChunks(sessionId, summary.recording_key);
        return res.json({ success: true, data: { sessionId, chunks } });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /sessions/:id/replay error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch replay' });
      }
    });
  }

  // ─── GET /summary ─────────────────────────────────────────────────────────
  if (isEnabled('summary')) {
    router.get('/summary', ...mw('summary'), async (req: Request, res: Response): Promise<Response> => {
      try {
        const { from, to } = req.query;
        const range = {
          from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: to ? new Date(to as string) : new Date(),
        };
        const summary = await storage.getDashboardSummary(range);
        return res.json({ success: true, data: summary });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /summary error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch summary' });
      }
    });
  }

  // ─── GET /devices ─────────────────────────────────────────────────────────
  if (isEnabled('devices')) {
    router.get('/devices', ...mw('devices'), async (req: Request, res: Response): Promise<Response> => {
      try {
        const { from, to, type = 'device' } = req.query;
        const range = {
          from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: to ? new Date(to as string) : new Date(),
        };
        const breakdownType = (type as string) === 'browser' ? 'browser' : (type as string) === 'os' ? 'os' : 'device';
        const data = await storage.getDeviceBreakdown(breakdownType, range);
        return res.json({ success: true, data });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /devices error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch device breakdown' });
      }
    });
  }

  // ─── GET /top-pages ───────────────────────────────────────────────────────
  if (isEnabled('topPages')) {
    router.get('/top-pages', ...mw('topPages'), async (req: Request, res: Response): Promise<Response> => {
      try {
        const { from, to, limit } = req.query;
        const range = {
          from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: to ? new Date(to as string) : new Date(),
        };
        const data = await storage.getTopPages(range, limit ? parseInt(limit as string, 10) : 20);
        return res.json({ success: true, data });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /top-pages error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch top pages' });
      }
    });
  }

  // ─── GET /funnel ──────────────────────────────────────────────────────────
  if (isEnabled('funnel')) {
    router.get('/funnel', ...mw('funnel'), async (req: Request, res: Response): Promise<Response> => {
      try {
        const { from, to, urls } = req.query;
        if (!urls) {
          return res.status(400).json({ success: false, error: 'Query param "urls" is required (comma-separated list of URL paths)' });
        }
        const urlList = (urls as string).split(',').map((u) => u.trim()).filter(Boolean);
        const range = {
          from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: to ? new Date(to as string) : new Date(),
        };
        const data = await storage.getFunnelSteps(urlList, range);
        return res.json({ success: true, data });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /funnel error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch funnel' });
      }
    });
  }

  // ─── GET /utm ─────────────────────────────────────────────────────────────
  if (isEnabled('utm')) {
    router.get('/utm', ...mw('utm'), async (req: Request, res: Response): Promise<Response> => {
      try {
        const { from, to } = req.query;
        const range = {
          from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: to ? new Date(to as string) : new Date(),
        };
        const data = await storage.getUtmBreakdown(range);
        return res.json({ success: true, data });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /utm error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch UTM breakdown' });
      }
    });
  }

  // ─── GET /live (SSE) ──────────────────────────────────────────────────────
  if (isEnabled('live')) {
    router.get('/live', ...mw('live'), (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const withinSeconds = req.query.withinSeconds ? parseInt(req.query.withinSeconds as string, 10) : 300;
      const intervalMs = req.query.intervalMs ? parseInt(req.query.intervalMs as string, 10) : 15000;

      const send = async () => {
        try {
          const count = await storage.getActiveVisitorCount(withinSeconds);
          res.write(`data: ${JSON.stringify({ count, timestamp: new Date().toISOString() })}\n\n`);
        } catch {
          // Silently ignore — client will reconnect
        }
      };

      send();
      const interval = setInterval(send, Math.max(intervalMs, 5000));

      req.on('close', () => {
        clearInterval(interval);
        res.end();
      });
    });
  }

  return router;
}
