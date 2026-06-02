# 🚀 OmniTracker (Modular Visitor Analytics & Session Replay SDK)

[![NPM Version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)](https://www.npmjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

**OmniTracker** is a powerful, production-grade, highly optimized, and modular analytics suite for Node.js and browser applications. It enables click tracking, scroll depth monitoring, rage click detection, offline network sync, and compressed session replays (using `rrweb` + `pako` Gzip) out of the box.

Designed from the ground up for minimal bundle impact: developers install a lightweight core package (~few KB) and plug in heavier extensions like session replay only if needed.

---

## 🌟 Features

* **⚡ Lightweight Core**: Zero-dependency browser package.
* **🎥 Session Replay**: High-fidelity DOM mutation recording (`rrweb`) compressed via Gzip (`pako`) on-the-fly.
* **📡 DB & Replay Storage Agnostic**: Pluggable storage system. Supports Memory, local disk, Drizzle/Postgres, or Cloudflare R2/AWS S3.
* **🛡️ Bot Filtering**: Built-in, high-efficiency User-Agent crawler check.
* **🔋 Offline Event Queue**: Automatic recovery of failed tracking events via `localStorage` retries.
* **📊 Click & Rage Click Detection**: Detect frustational patterns (e.g. 3 clicks in a small radius within 500ms).
* **📉 Scroll Depth Tracking**: Tracks milestones (25%, 50%, 75%, 100%) using modern `IntersectionObserver`.

---

## 📦 Packages in this Monorepo

| Package | Directory | Description |
| :--- | :--- | :--- |
| **`@dev-sujay/tracker-core`** | [`packages/core`](file:///C:/Users/HP/Desktop/TLH/Tracking/packages/core) | Core event engine, offline queue, and plugin system. |
| **`@dev-sujay/tracker-extension-scroll`** | [`packages/extension-scroll`](file:///C:/Users/HP/Desktop/TLH/Tracking/packages/extension-scroll) | Scroll depth tracking plugin. |
| **`@dev-sujay/tracker-extension-rage-click`** | [`packages/extension-rage-click`](file:///C:/Users/HP/Desktop/TLH/Tracking/packages/extension-rage-click) | Rage click detector plugin. |
| **`@dev-sujay/tracker-extension-replay`** | [`packages/extension-replay`](file:///C:/Users/HP/Desktop/TLH/Tracking/packages/extension-replay) | rrweb-based screen recording plugin. |
| **`@dev-sujay/tracker-server`** | [`packages/server`](file:///C:/Users/HP/Desktop/TLH/Tracking/packages/server) | Express router, storage adapters, and bot filters. |

---

## 🗺️ Architectural Flow

```
[ Client Browser ] ────────── (Network Payload) ──────────► [ Express Server ]
     │                                                            │
     ├─► Core: page_view / click ──► /track-site-visit ───────────┼─► Storage Adapter
     ├─► Scroll Extension: scroll ──► /track-site-visit            │     ├─► Memory
     ├─► Rage Click: frustation ──► /track-site-visit             │     └─► Drizzle (PostgreSQL)
     │                                                            │
     └─► Replay Extension: DOM mutations ──► /session-replay/:id ─┼─► Replay Adapter
                                                                  ├─► Disk
                                                                  └─► S3 / R2 (Gzip Chunks)
```

---

## 🚀 Quick Start

### 1. Frontend Integration

Install core and desired extension plugins:
```bash
bun add @dev-sujay/tracker-core @dev-sujay/tracker-extension-scroll @dev-sujay/tracker-extension-replay
```

Initialize inside your frontend application:
```typescript
import { TrackerCore } from '@dev-sujay/tracker-core';
import { ScrollTrackingExtension } from '@dev-sujay/tracker-extension-scroll';
import { SessionReplayExtension } from '@dev-sujay/tracker-extension-replay';

const tracker = new TrackerCore({
  apiUrl: 'http://localhost:5000/api',
  getAuthToken: () => localStorage.getItem('user_token'),
});

tracker.use(new ScrollTrackingExtension());
tracker.use(new SessionReplayExtension({ uploadIntervalMs: 60000 }));

tracker.init();
```

---

### 2. Backend Router Setup

Install the backend server package:
```bash
bun add @dev-sujay/tracker-server express
```

Set up an Express router:
```typescript
import express from 'express';
import { createTrackerRouter, MemoryTrackerStorage, LocalFileReplayStorage } from '@dev-sujay/tracker-server';

const app = express();

const trackerRouter = createTrackerRouter({
  storage: new MemoryTrackerStorage(),
  replayStorage: new LocalFileReplayStorage({ baseDir: './replays' }),
});

app.use('/api', trackerRouter);
app.listen(5000);
```

---

### 3. Database Schema Setup

OmniTracker requires two database tables: `site_visits` and `session_summaries`.

* **Option A: Drizzle ORM (Automated)**:
  Import and export the tables in your Drizzle schema file and run drizzle migrations:
  ```typescript
  export { siteVisitsSchema, sessionSummariesSchema } from '@dev-sujay/tracker-server';
  ```
  ```bash
  npx drizzle-kit generate:pg && npx drizzle-kit push:pg
  ```

* **Option B: Raw SQL Migration (Manual)**:
  Execute the PostgreSQL setup query script located in [`packages/server/migration.sql`](file:///C:/Users/HP/Desktop/TLH/Tracking/packages/server/migration.sql) in your database tool.

---

## 📖 Detailed Documentation

We have built a dedicated VitePress website explaining API settings, configuration, and advanced adapter setups:

* **Guides & Docs**: Look at the [`docs/` directory](file:///C:/Users/HP/Desktop/TLH/Tracking/docs) or run the docs site locally:
  ```bash
  bun run docs:dev
  ```

---

## 🧪 Testing Locally (Running Examples)

1. Clone and install dependencies:
   ```bash
   bun install
   ```
2. Build the monorepo packages:
   ```bash
   bun run build
   ```
3. Run the Express example backend:
   ```bash
   bun run dev:server
   ```
4. Run the React example app:
   ```bash
   bun run dev:client
   ```
5. Open `http://localhost:3000` to interact with the sandbox.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
