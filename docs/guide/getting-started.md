# Getting Started

**OmniTracker** is a modular visitor tracking suite. It consists of a lightweight **Client Core** that runs in the user's browser, and a **Server router** that runs in your Express/Node.js backend to capture events, click maps, and video replays.

---

## Installation

### 1. Frontend Client
Install the core tracking library and the extensions you wish to enable:

```bash
bun add @dev-sujay/omnitracker
# Enable extensions
bun add @dev-sujay/omnitracker-extension-scroll @dev-sujay/omnitracker-extension-rage-click @dev-sujay/omnitracker-extension-replay
```

### 2. Backend Server
Install the Express router package:

```bash
bun add @dev-sujay/omnitracker-server express
```

---

## Quick Setup (Client)

Initialize the core tracker in your website's main entry script (e.g. `main.ts` or `index.js`):

```typescript
import { TrackerCore } from '@dev-sujay/omnitracker';
import { ScrollTrackingExtension } from '@dev-sujay/omnitracker-extension-scroll';
import { RageClickExtension } from '@dev-sujay/omnitracker-extension-rage-click';
import { SessionReplayExtension } from '@dev-sujay/omnitracker-extension-replay';

// Configure Core
const tracker = new TrackerCore({
  apiUrl: 'http://localhost:5000/api', // Your backend API endpoint
});

// Load Plugins
tracker.use(new ScrollTrackingExtension());
tracker.use(new RageClickExtension());
tracker.use(new SessionReplayExtension({
  uploadIntervalMs: 60000,
  maskAllInputs: false
}));

// Run
tracker.init();
```

---

## Quick Setup (Backend)

Attach the tracking endpoints to your Express application using in-memory and local disk storage:

```typescript
import express from 'express';
import { 
  createTrackerRouter, 
  MemoryTrackerStorage, 
  LocalFileReplayStorage 
} from '@dev-sujay/omnitracker-server';

const app = express();

// Set up local file directories and memory DB
const storage = new MemoryTrackerStorage();
const replayStorage = new LocalFileReplayStorage({ baseDir: './replays' });

const trackerRouter = createTrackerRouter({
  storage,
  replayStorage
});

app.use('/api', trackerRouter);
app.listen(5000);
```

You are now fully set up! Page views, button clicks, scrolls, rage clicks, and screen replays are recorded and saved.
