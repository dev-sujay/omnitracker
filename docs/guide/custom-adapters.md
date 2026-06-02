# Custom Storage Adapters

You can customize where tracking events and session replays are stored by implementing the `TrackerStorage` and `ReplayStorage` interfaces.

---

## 1. Custom Database Adapter (`TrackerStorage`)

Implement the `TrackerStorage` interface to save visits to Prisma, Knex, MongoDB, or any other DB tool.

```typescript
import { TrackerStorage, SiteVisitPayload, SessionSummaryPayload } from '@dev-sujay/tracker-server';

export class PrismaTrackerStorage implements TrackerStorage {
  constructor(private prismaClient: any) {}

  async saveSiteVisit(data: SiteVisitPayload): Promise<void> {
    await this.prismaClient.siteVisit.create({
      data: {
        sessionId: data.sessionId,
        visitorId: data.visitorId,
        eventType: data.eventType,
        eventLabel: data.eventLabel,
        pageUrl: data.pageUrl,
        ipAddress: data.ipAddress,
        country: data.country,
        created_at: new Date()
      }
    });
  }

  async saveSessionSummary(data: SessionSummaryPayload): Promise<void> {
    await this.prismaClient.sessionSummary.upsert({
      where: { session_id: data.session_id },
      update: {
        last_activity: data.last_activity,
        event_count: data.event_count,
      },
      create: {
        session_id: data.session_id,
        visitor_id: data.visitor_id,
        start_time: data.start_time,
        last_activity: data.last_activity,
        event_count: data.event_count
      }
    });
  }

  async getSessionSummary(sessionId: string): Promise<SessionSummaryPayload | null> {
    return await this.prismaClient.sessionSummary.findUnique({
      where: { session_id: sessionId }
    });
  }

  async updateSessionRecording(sessionId: string, recordingKey: string): Promise<void> {
    await this.prismaClient.sessionSummary.update({
      where: { session_id: sessionId },
      data: { recording_key: recordingKey }
    });
  }
}
```

---

## 2. Custom Upload Adapter (`ReplayStorage`)

Implement the `ReplayStorage` interface to upload session recording files to Google Cloud Storage (GCS), Azure Blobs, or a private Minio server.

```typescript
import { ReplayStorage } from '@dev-sujay/tracker-server';
import { Storage } from '@google-cloud/storage';

export class GcsReplayStorage implements ReplayStorage {
  private bucket;

  constructor(bucketName: string) {
    const storage = new Storage();
    this.bucket = storage.bucket(bucketName);
  }

  async uploadChunk(sessionId: string, chunkFileName: string, buffer: Buffer): Promise<string> {
    // Save to path: replays/session-id/chunk-name.json.gz
    const key = `replays/${sessionId}/${chunkFileName}`;
    await this.bucket.file(key).save(buffer, {
      contentType: 'application/gzip',
    });
    
    // Return recordingKey folder identifier
    return `replays/${sessionId}/`;
  }

  async listChunks(sessionId: string, recordingKey: string): Promise<string[]> {
    const [files] = await this.bucket.getFiles({ prefix: recordingKey });
    return files
      .map(f => f.name)
      .filter(name => name.endsWith('.json.gz'))
      .sort();
  }

  async getChunk(key: string): Promise<Buffer> {
    const [buffer] = await this.bucket.file(key).download();
    return buffer;
  }
}
```
