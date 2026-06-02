import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

// ─── 1. REPLAY STORAGE INTERFACE ─────────────────────────────────────────────
export interface ReplayStorage {
  uploadChunk(sessionId: string, chunkFileName: string, buffer: Buffer): Promise<string>;
  listChunks(sessionId: string, recordingKey: string): Promise<string[]>;
  getChunk(key: string): Promise<Buffer>;
}

// ─── 2. S3 REPLAY STORAGE ────────────────────────────────────────────────────
export class S3ReplayStorage implements ReplayStorage {
  private s3Client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(config: {
    s3Client?: S3Client;
    bucket: string;
    prefix?: string;
    region?: string;
    credentials?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
  }) {
    this.bucket = config.bucket;
    this.prefix = config.prefix ?? 'session_replays';
    this.s3Client =
      config.s3Client ??
      new S3Client({
        region: config.region ?? 'us-east-1',
        credentials: config.credentials,
      });
  }

  public async uploadChunk(sessionId: string, chunkFileName: string, buffer: Buffer): Promise<string> {
    const s3Key = `${this.prefix}/${sessionId}/${chunkFileName}`;
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: 'application/gzip',
      })
    );
    // Return key prefix for listing
    return `${this.prefix}/${sessionId}/`;
  }

  public async listChunks(sessionId: string, recordingKey: string): Promise<string[]> {
    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: recordingKey,
    });
    const listResponse = await this.s3Client.send(listCommand);
    const s3Objects = listResponse.Contents || [];
    const chunkKeys = s3Objects
      .map((obj) => obj.Key)
      .filter((key): key is string => !!key && key.endsWith('.json.gz'));

    chunkKeys.sort(); // Sort alphabetically to guarantee chronological order
    return chunkKeys;
  }

  public async getChunk(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const s3Response = await this.s3Client.send(command);
    if (!s3Response.Body) {
      throw new Error('S3 chunk body is empty');
    }
    return this.streamToBuffer(s3Response.Body as Readable);
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}

// ─── 3. LOCAL FILE REPLAY STORAGE ────────────────────────────────────────────
export class LocalFileReplayStorage implements ReplayStorage {
  private baseDir: string;

  constructor(options?: { baseDir?: string }) {
    this.baseDir = options?.baseDir ?? path.join(process.cwd(), 'replays_storage');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public async uploadChunk(sessionId: string, chunkFileName: string, buffer: Buffer): Promise<string> {
    const sessionDir = path.join(this.baseDir, sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    const filePath = path.join(sessionDir, chunkFileName);
    await fs.promises.writeFile(filePath, buffer);
    return sessionId; // Using sessionId folder identifier as recordingKey
  }

  public async listChunks(sessionId: string, recordingKey: string): Promise<string[]> {
    const sessionDir = path.join(this.baseDir, recordingKey);
    if (!fs.existsSync(sessionDir)) {
      return [];
    }
    const files = await fs.promises.readdir(sessionDir);
    const chunkFiles = files
      .filter((f) => f.endsWith('.json.gz'))
      .map((f) => path.join(recordingKey, f));

    chunkFiles.sort(); // Chronological sort
    return chunkFiles;
  }

  public async getChunk(key: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, key);
    return await fs.promises.readFile(filePath);
  }
}
