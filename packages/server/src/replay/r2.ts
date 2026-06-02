/**
 * Cloudflare R2 Replay Storage
 *
 * Cloudflare R2 is S3-compatible but requires a custom endpoint.
 * This adapter is a thin wrapper around S3ReplayStorage with R2 defaults.
 *
 * @example
 * const storage = new CloudflareR2ReplayStorage({
 *   accountId: process.env.R2_ACCOUNT_ID,
 *   accessKeyId: process.env.R2_ACCESS_KEY_ID,
 *   secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
 *   bucket: process.env.R2_BUCKET,
 *   prefix: 'session_replays',
 * })
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { ReplayStorage } from '../types.js';

export interface CloudflareR2Config {
  /** Cloudflare Account ID */
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  prefix?: string;
  /**
   * Optional: custom endpoint override.
   * Defaults to `https://<accountId>.r2.cloudflarestorage.com`
   */
  endpoint?: string;
}

export class CloudflareR2ReplayStorage implements ReplayStorage {
  private s3: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(config: CloudflareR2Config) {
    this.bucket = config.bucket;
    this.prefix = config.prefix ?? 'session_replays';
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: config.endpoint ?? `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  public async uploadChunk(sessionId: string, chunkFileName: string, buffer: Buffer): Promise<string> {
    const key = `${this.prefix}/${sessionId}/${chunkFileName}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/gzip',
      })
    );
    return `${this.prefix}/${sessionId}/`;
  }

  public async listChunks(sessionId: string, recordingKey: string): Promise<string[]> {
    const resp = await this.s3.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: recordingKey })
    );
    const keys = (resp.Contents ?? [])
      .map((o) => o.Key)
      .filter((k): k is string => !!k && k.endsWith('.json.gz'));
    keys.sort();
    return keys;
  }

  public async getChunk(key: string): Promise<Buffer> {
    const resp = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!resp.Body) throw new Error('R2 chunk body is empty');
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
