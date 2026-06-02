import express from 'express';
import cors from 'cors';
import {
  createTrackerRouter,
  MemoryTrackerStorage,
  LocalFileReplayStorage,
} from '@dev-sujay/tracker-server';

const app = express();
const PORT = 5000;

app.use(cors({
  origin: 'http://localhost:3000', // react-app example client port
  credentials: true,
}));

// Configure DB memory storage (no database setup required for testing!)
const storage = new MemoryTrackerStorage();

// Configure local file storage for session replays (no AWS S3 required for testing!)
const replayStorage = new LocalFileReplayStorage({
  baseDir: './local_replays_store',
});

// Create tracker express router
const trackerRouter = createTrackerRouter({
  storage,
  replayStorage,
  resolveCountry: (ip) => {
    // Mock IP country geolocation
    if (ip === '127.0.0.1' || ip === '::1') return 'Localhost';
    return 'United Kingdom';
  },
});

app.use('/api', trackerRouter);

// Basic endpoint to print visits for demonstration
app.get('/api/debug-visits', (req, res) => {
  res.json({
    visits: storage.getVisits(),
  });
});

app.listen(PORT, () => {
  console.log(`[ExpressExample] Tracker server listening on http://localhost:${PORT}`);
  console.log(`[ExpressExample] - Tracking endpoint: http://localhost:${PORT}/api/track-site-visit`);
  console.log(`[ExpressExample] - Session upload endpoint: http://localhost:${PORT}/api/session-replay/:sessionId`);
  console.log(`[ExpressExample] - Debug visits dashboard: http://localhost:${PORT}/api/debug-visits`);
});
