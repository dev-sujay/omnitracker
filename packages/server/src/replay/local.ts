import * as fs from 'fs';
import * as path from 'path';
import { ReplayStorage } from '../types.js';

/**
 * LocalFileReplayStorage
 *
 * Stores replay chunks on the local filesystem.
 * Ideal for development, self-hosted, or single-server deployments.
 *
 * @example
 * const storage = new LocalFileReplayStorage()
 * // Stores in: ./replays_storage/<sessionId>/<chunk>.json.gz
 *
 * const storage = new LocalFileReplayStorage({ baseDir: '/var/data/replays' })
 */
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
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
    await fs.promises.writeFile(path.join(sessionDir, chunkFileName), buffer);
    return sessionId;
  }

  public async listChunks(sessionId: string, recordingKey: string): Promise<string[]> {
    const sessionDir = path.join(this.baseDir, recordingKey);
    if (!fs.existsSync(sessionDir)) return [];
    const files = await fs.promises.readdir(sessionDir);
    return files
      .filter((f) => f.endsWith('.json.gz'))
      .map((f) => path.join(recordingKey, f))
      .sort();
  }

  public async getChunk(key: string): Promise<Buffer> {
    return fs.promises.readFile(path.join(this.baseDir, key));
  }
}
