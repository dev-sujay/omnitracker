# @dev-sujay/omnitracker-server

**OmniTracker Server SDK** is a powerful server-side companion for Node.js Express backends. It exposes a unified configuration system (`registerOmniTracker`) to handle visitor tracking, session recording uploads, administrative analytics query endpoints, Drizzle database mapping, S3/R2 replay storage adapters, and bot filtering checks.

---

## 📦 Installation

```bash
npm install @dev-sujay/omnitracker-server
# or
yarn add @dev-sujay/omnitracker-server
# or
bun add @dev-sujay/omnitracker-server
```

---

## 🚀 One-Liner Express Integration

OmniTracker server routes can be mounted automatically inside an Express router using `registerOmniTracker`:

```typescript
import express from 'express';
import { 
  registerOmniTracker, 
  DrizzleTrackerStorage, 
  LocalFileReplayStorage 
} from '@dev-sujay/omnitracker-server';
import { db } from './db';

const app = express();
const router = express.Router();

registerOmniTracker(router, {
  // Database storage adapter
  storage: new DrizzleTrackerStorage(db),
  
  // Replay chunks file storage adapter (Local, S3,CF R2 supported)
  replayStorage: new LocalFileReplayStorage({ baseDir: './replays' }),
  
  // Optional rate limiting, geolocation hooks, and auth middleware overrides
  resolveCountry: (ip) => 'United Kingdom',
  trackingAuthMiddleware: [optionalAuthMiddleware],
  replayAuthMiddleware: [requireAuth, checkAdminPermissions],
});

app.use('/api/analytics', router);
```

---

## 🗄️ Storage Adapters

OmniTracker includes prebuilt, production-ready storage adapters:

### 1. Database Adapters
- **Drizzle Postgres Adapter**: `DrizzleTrackerStorage` (Requires `drizzle-orm`)
- **MongoDB Adapter**: `MongoTrackerStorage` (Requires `mongodb`)
- **Prisma Adapter**: `PrismaTrackerStorage` (Requires `@prisma/client`)
- **Memory Adapter**: `MemoryTrackerStorage` (For local/testing setups)

### 2. Session Replay Chunk Adapters
- **AWS S3 Adapter**: `S3ReplayStorage`
- **Cloudflare R2 Adapter**: `CloudflareR2ReplayStorage`
- **Local Disk Adapter**: `LocalFileReplayStorage`

---

## 🛠️ Database Schemas

If using the Drizzle ORM database adapter, you can directly import the prebuilt Postgres schemas:

```typescript
export { 
  siteVisitsTable, 
  sessionSummariesTable 
} from '@dev-sujay/omnitracker-server';
```

Then run Drizzle migrations or push statements:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## 📄 License

Distributed under the MIT License.
