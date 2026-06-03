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
        const { from, to, country, device, browser, customerId, visitorType, hasRecording, page, limit, search, searchTerm, isConverted, isLoggedIn, startDate, endDate, offset } = req.query;

        if (config.resolveSessions) {
          const resolvedPage = page
            ? parseInt(page as string, 10)
            : offset
              ? Math.floor(parseInt(offset as string, 10) / (limit ? parseInt(limit as string, 10) : 25)) + 1
              : 1;
          const resolvedLimit = limit ? parseInt(limit as string, 10) : 25;

          const result = await config.resolveSessions({
            startDate: (startDate || from) as string | undefined,
            endDate: (endDate || to) as string | undefined,
            searchTerm: (searchTerm || search) as string | undefined,
            isConverted: isConverted === 'true' ? true : isConverted === 'false' ? false : undefined,
            isLoggedIn: isLoggedIn === 'true' ? true : isLoggedIn === 'false' ? false : undefined,
            page: resolvedPage,
            limit: resolvedLimit,
          });

          return res.json({ success: true, status: 'success', data: result });
        }

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

        return res.json({ success: true, status: 'success', data: result });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /sessions error:', err);
        return res.status(500).json({ success: false, status: 'error', message: 'Failed to fetch sessions' });
      }
    });
  }

  // ─── GET /sessions/:sessionId/journey ─────────────────────────────────────
  if (isEnabled('sessionJourney')) {
    router.get('/sessions/:sessionId/journey', ...mw('sessionJourney'), async (req: Request, res: Response): Promise<Response> => {
      try {
        const sessionId = req.params.sessionId as string;
        const journey = await storage.getSessionJourney(sessionId);
        return res.json({ success: true, status: 'success', data: journey });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /sessions/:id/journey error:', err);
        return res.status(500).json({ success: false, status: 'error', message: 'Failed to fetch session journey' });
      }
    });
  }

  // ─── GET /sessions/:sessionId/replay ──────────────────────────────────────
  if (isEnabled('sessionReplay')) {
    router.get('/sessions/:sessionId/replay', ...mw('sessionReplay'), async (req: Request, res: Response): Promise<Response> => {
      try {
        if (!replayStorage) {
          return res.status(501).json({ success: false, status: 'error', message: 'Replay storage is not configured' });
        }
        const sessionId = req.params.sessionId as string;
        const summary = await storage.getSessionSummary(sessionId);
        if (!summary?.recording_key) {
          return res.status(404).json({ success: false, status: 'error', message: 'No recording found for this session' });
        }
        const chunks = await replayStorage.listChunks(sessionId, summary.recording_key);
        return res.json({ success: true, status: 'success', data: { sessionId, chunks } });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /sessions/:id/replay error:', err);
        return res.status(500).json({ success: false, status: 'error', message: 'Failed to fetch replay' });
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
        return res.json({ success: true, status: 'success', data: summary });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /summary error:', err);
        return res.status(500).json({ success: false, status: 'error', message: 'Failed to fetch summary' });
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
        return res.json({ success: true, status: 'success', data });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /devices error:', err);
        return res.status(500).json({ success: false, status: 'error', message: 'Failed to fetch device breakdown' });
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
        return res.json({ success: true, status: 'success', data });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /top-pages error:', err);
        return res.status(500).json({ success: false, status: 'error', message: 'Failed to fetch top pages' });
      }
    });
  }

  // ─── GET /funnel ──────────────────────────────────────────────────────────
  if (isEnabled('funnel')) {
    router.get('/funnel', ...mw('funnel'), async (req: Request, res: Response): Promise<Response> => {
      try {
        const { from, to, urls } = req.query;
        if (!urls) {
          return res.status(400).json({ success: false, status: 'error', message: 'Query param "urls" is required (comma-separated list of URL paths)' });
        }
        const urlList = (urls as string).split(',').map((u) => u.trim()).filter(Boolean);
        const range = {
          from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: to ? new Date(to as string) : new Date(),
        };
        const data = await storage.getFunnelSteps(urlList, range);
        return res.json({ success: true, status: 'success', data });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /funnel error:', err);
        return res.status(500).json({ success: false, status: 'error', message: 'Failed to fetch funnel' });
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
        return res.json({ success: true, status: 'success', data });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /utm error:', err);
        return res.status(500).json({ success: false, status: 'error', message: 'Failed to fetch UTM breakdown' });
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

  // ─── GET /journey/:sessionId (Compatibility Route) ─────────────────────────
  if (isEnabled('journey')) {
    router.get('/journey/:sessionId', ...mw('journey'), async (req: Request, res: Response): Promise<Response> => {
      try {
        const sessionId = req.params.sessionId as string;
        const rawJourney = await storage.getSessionJourney(sessionId);
        
        const enrichedJourney = await Promise.all(
          rawJourney.map(async (visit) => {
            let customerEmail: string | null = null;
            let customerName: string | null = null;
            if (config.resolveCustomerInfo && visit.customerId) {
              try {
                const info = await config.resolveCustomerInfo(visit.customerId);
                if (info) {
                  customerEmail = info.email;
                  customerName = info.name;
                }
              } catch (e) {
                // Ignore
              }
            }

            return {
              id: (visit as any).id ?? Math.floor(Math.random() * 1000000),
              session_id: visit.sessionId,
              event_type: visit.eventType || 'PAGE_VIEW',
              event_label: visit.eventLabel || '',
              page_url: visit.pageUrl || '',
              device_type: visit.deviceType || '',
              browser: visit.browser || '',
              os: visit.os || '',
              country: visit.country || '',
              ip_address: visit.ipAddress || null,
              utm_source: visit.utmSource || '',
              utm_medium: visit.utmMedium || '',
              utm_campaign: visit.utmCampaign || '',
              referrer: visit.referrer || '',
              landing_page: visit.landingPage || '',
              created_at: (visit as any).createdAt 
                ? new Date((visit as any).createdAt).toISOString() 
                : (visit as any).created_at
                  ? new Date((visit as any).created_at).toISOString()
                  : new Date().toISOString(),
              metadata: visit.metadata || undefined,
              customer_id: visit.customerId ? Number(visit.customerId) : null,
              customer_email: customerEmail,
              customer_name: customerName,
              recording_key: (visit as any).recordingKey ?? (visit as any).recording_key ?? null,
            };
          })
        );

        return res.json({ success: true, status: 'success', data: enrichedJourney });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /journey/:sessionId error:', err);
        return res.status(500).json({ success: false, status: 'error', message: 'Failed to fetch session journey' });
      }
    });
  }

  // ─── GET /journey/order/:orderId (Compatibility Route) ─────────────────────
  if (isEnabled('journeyByOrder')) {
    router.get('/journey/order/:orderId', ...mw('journeyByOrder'), async (req: Request, res: Response): Promise<Response> => {
      try {
        const orderId = parseInt(req.params.orderId as string, 10);
        if (isNaN(orderId)) {
          return res.status(400).json({ success: false, status: 'error', message: 'Invalid order ID' });
        }
        
        if (!config.getSessionIdFromOrderId) {
          return res.status(501).json({ success: false, status: 'error', message: 'Order tracking is not configured' });
        }

        const sessionId = await config.getSessionIdFromOrderId(orderId);
        if (!sessionId) {
          return res.status(404).json({ success: false, status: 'error', message: 'Session tracking ID not found for this order' });
        }

        const rawJourney = await storage.getSessionJourney(sessionId);
        
        const enrichedJourney = await Promise.all(
          rawJourney.map(async (visit) => {
            let customerEmail: string | null = null;
            let customerName: string | null = null;
            if (config.resolveCustomerInfo && visit.customerId) {
              try {
                const info = await config.resolveCustomerInfo(visit.customerId);
                if (info) {
                  customerEmail = info.email;
                  customerName = info.name;
                }
              } catch (e) {
                // Ignore
              }
            }

            return {
              id: (visit as any).id ?? Math.floor(Math.random() * 1000000),
              session_id: visit.sessionId,
              event_type: visit.eventType || 'PAGE_VIEW',
              event_label: visit.eventLabel || '',
              page_url: visit.pageUrl || '',
              device_type: visit.deviceType || '',
              browser: visit.browser || '',
              os: visit.os || '',
              country: visit.country || '',
              ip_address: visit.ipAddress || null,
              utm_source: visit.utmSource || '',
              utm_medium: visit.utmMedium || '',
              utm_campaign: visit.utmCampaign || '',
              referrer: visit.referrer || '',
              landing_page: visit.landingPage || '',
              created_at: (visit as any).createdAt 
                ? new Date((visit as any).createdAt).toISOString() 
                : (visit as any).created_at
                  ? new Date((visit as any).created_at).toISOString()
                  : new Date().toISOString(),
              metadata: visit.metadata || undefined,
              customer_id: visit.customerId ? Number(visit.customerId) : null,
              customer_email: customerEmail,
              customer_name: customerName,
              recording_key: (visit as any).recordingKey ?? (visit as any).recording_key ?? null,
            };
          })
        );

        return res.json({ success: true, status: 'success', data: enrichedJourney });
      } catch (err) {
        console.error('[OmniTracker Admin] GET /journey/order/:orderId error:', err);
        return res.status(500).json({ success: false, status: 'error', message: 'Failed to fetch order journey' });
      }
    });
  }


  // ─── GET /sessions/export (Compatibility Route) ─────────────────────────────
  if (isEnabled('exportSessions')) {
    router.get('/sessions/export', ...mw('exportSessions'), async (req: Request, res: Response): Promise<Response | void> => {
      try {
        if (!config.exportSessions) {
          return res.status(501).json({ success: false, status: 'error', message: 'Session exporting is not configured' });
        }
        const { startDate, endDate, searchTerm, isConverted, isLoggedIn } = req.query;
        const csvContent = await config.exportSessions({
          startDate: startDate as string | undefined,
          endDate: endDate as string | undefined,
          searchTerm: searchTerm as string | undefined,
          isConverted: isConverted === 'true' ? true : isConverted === 'false' ? false : undefined,
          isLoggedIn: isLoggedIn === 'true' ? true : isLoggedIn === 'false' ? false : undefined,
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=sessions-export.csv');
        return res.status(200).send(csvContent);
      } catch (err) {
        console.error('[OmniTracker Admin] GET /sessions/export error:', err);
        return res.status(500).json({ success: false, status: 'error', message: 'Failed to export sessions' });
      }
    });
  }

  return router;
}
