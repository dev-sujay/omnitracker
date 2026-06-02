import express, { Router, Request, Response, NextFunction } from 'express';
import * as zlib from 'zlib';
import { Readable } from 'stream';
import { TrackerStorage, SiteVisitPayload } from './storage.js';
import { ReplayStorage } from './replay-storage.js';
import { isBot, getUserAgent } from './bot-filter.js';

export interface TrackerRouterConfig {
  storage: TrackerStorage;
  replayStorage?: ReplayStorage;
  resolveCountry?: (ip: string) => string | null | Promise<string | null>;
  rateLimitMiddleware?: (req: Request, res: Response, next: NextFunction) => void;
}

export function createTrackerRouter(config: TrackerRouterConfig): Router {
  const router = Router();
  const rawBodyParser = express.raw({ type: 'application/octet-stream', limit: '10mb' });

  // 1. Event Tracking Endpoint
  router.post(
    '/track-site-visit',
    config.rateLimitMiddleware || ((req, res, next) => next()),
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const ua = getUserAgent(req.headers['user-agent']);
        
        // Bot/Crawler Filtering
        if (isBot(ua)) {
          return res.status(200).json({ success: true, message: 'ok (bot filtered)' });
        }

        const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '';
        const clientIp = ip.split(',')[0].trim();
        
        let country: string | null = null;
        if (config.resolveCountry && clientIp) {
          try {
            country = await config.resolveCountry(clientIp);
          } catch (e) {
            // Ignore geo errors
          }
        }

        const body = req.body as Partial<SiteVisitPayload>;

        const data: SiteVisitPayload = {
          sessionId: body.sessionId || '',
          visitorId: body.visitorId ?? null,
          deviceType: body.deviceType ?? null,
          browser: body.browser ?? null,
          os: body.os ?? null,
          utmSource: body.utmSource ?? null,
          utmMedium: body.utmMedium ?? null,
          utmCampaign: body.utmCampaign ?? null,
          utmContent: body.utmContent ?? null,
          utmTerm: body.utmTerm ?? null,
          referrer: body.referrer ?? null,
          landingPage: body.landingPage ?? null,
          eventType: body.eventType ?? null,
          eventLabel: body.eventLabel ?? null,
          pageUrl: body.pageUrl ?? null,
          metadata: body.metadata ?? null,
          timeOnPage: body.timeOnPage ?? null,
          scrollDepth: body.scrollDepth ?? null,
          customerId: body.customerId ?? null,
          ipAddress: clientIp,
          country: country || body.country || null,
        };

        await config.storage.saveSiteVisit(data);

        return res.status(200).json({ success: true, message: 'Event tracked successfully' });
      } catch (err) {
        console.error('[TrackerServer] Error in track-site-visit:', err);
        return res.status(500).json({ success: false, error: 'Internal tracking error' });
      }
    }
  );

  // 2. Upload Session Replay Chunk
  router.post(
    '/session-replay/:sessionId',
    rawBodyParser,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const { sessionId } = req.params;
        const buffer = req.body as Buffer;

        if (!config.replayStorage) {
          return res.status(500).json({ success: false, error: 'Replay storage is not configured' });
        }

        if (!buffer || buffer.length === 0) {
          return res.status(400).json({ success: false, error: 'Empty payload' });
        }

        const chunkFileName = `chunk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.json.gz`;
        const recordingKey = await config.replayStorage.uploadChunk(sessionId, chunkFileName, buffer);

        // Link the recording key to the session summary
        await config.storage.updateSessionRecording(sessionId, recordingKey);

        return res.status(200).json({ success: true, message: 'Replay chunk uploaded successfully' });
      } catch (err) {
        console.error('[TrackerServer] Error in upload-session-replay:', err);
        return res.status(500).json({ success: false, error: 'Failed to upload replay chunk' });
      }
    }
  );

  // 3. List Session Replay Chunks
  router.get(
    '/session-replay/:sessionId',
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const { sessionId } = req.params;

        if (!config.replayStorage) {
          return res.status(500).json({ success: false, error: 'Replay storage is not configured' });
        }

        const summary = await config.storage.getSessionSummary(sessionId);
        if (!summary || !summary.recording_key) {
          return res.status(404).json({ success: false, error: 'Recording not found for session' });
        }

        const chunks = await config.replayStorage.listChunks(sessionId, summary.recording_key);
        
        return res.status(200).json({
          success: true,
          data: {
            type: 'chunked',
            chunks,
          },
        });
      } catch (err) {
        console.error('[TrackerServer] Error getting session replay list:', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve recording list' });
      }
    }
  );

  // 4. Retrieve and Gunzip a Single Replay Chunk on-the-fly
  router.get(
    '/session-replay/chunk',
    async (req: Request, res: Response): Promise<Response | void> => {
      try {
        const { key } = req.query;

        if (!config.replayStorage) {
          return res.status(500).json({ success: false, error: 'Replay storage is not configured' });
        }

        if (!key || typeof key !== 'string') {
          return res.status(400).json({ success: false, error: 'Missing chunk key' });
        }

        const rawBuffer = await config.replayStorage.getChunk(key);

        res.setHeader('Content-Type', 'application/json');
        
        // Decompress the buffer and stream directly into response
        const readable = new Readable();
        readable._read = () => {};
        readable.push(rawBuffer);
        readable.push(null);

        const gunzipStream = zlib.createGunzip();
        readable.pipe(gunzipStream).pipe(res);
      } catch (err) {
        console.error('[TrackerServer] Error fetching replay chunk:', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve chunk' });
      }
    }
  );

  return router;
}
