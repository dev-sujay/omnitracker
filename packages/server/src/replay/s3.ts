import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { ReplayStorage } from '../types.js';

/**
 * S3ReplayStorage
 *
 * AWS S3 (or any S3-compatible service) adapter for session replay chunk storage.
 *
 * @example
 * // With an existing S3Client
 * const storage = new S3ReplayStorage({ s3Client, bucket: 'my-bucket' })
 *
 * // Auto-create client from credentials
 * const storage = new S3ReplayStorage({
 *   region: 'eu-west-1',
 *   credentials: { accessKeyId, secretAccessKey },
 *   bucket: 'my-bucket',
 *   prefix: 'session_replays/prod',
 * })
 */
export class S3ReplayStorage implements ReplayStorage {
  private s3Client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(config: {
    s3Client?: S3Client;
    bucket: string;
    prefix?: string;
    region?: string;
    endpoint?: string;
    credentials?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
  }) {
    this.bucket = config.bucket;
    this.prefix = config.prefix ?? 'session_replays';
    this.s3Client =
      config.s3Client ??
      new S3Client({
        region: config.region ?? 'us-east-1',
        endpoint: config.endpoint,
        credentials: config.credentials,
      });
  }

  public async uploadChunk(sessionId: string, chunkFileName: string, buffer: Buffer): Promise<string> {
    const key = `${this.prefix}/${sessionId}/${chunkFileName}`;
    await this.s3Client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: 'application/gzip' })
    );
    return `${this.prefix}/${sessionId}/`;
  }

  public async listChunks(sessionId: string, recordingKey: string): Promise<string[]> {
    const resp = await this.s3Client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: recordingKey })
    );
    const keys = (resp.Contents ?? [])
      .map((o) => o.Key)
      .filter((k): k is string => !!k && k.endsWith('.json.gz'));
    keys.sort();
    return keys;
  }

  public async getChunk(key: string): Promise<Buffer> {
    const resp = await this.s3Client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!resp.Body) throw new Error('S3 chunk body is empty');
    return this.streamToBuffer(resp.Body as Readable);
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (c) => chunks.push(Buffer.from(c)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
