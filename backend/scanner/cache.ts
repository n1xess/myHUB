import fs from 'fs/promises';
import path from 'path';
import { CACHE_DIR } from './config.js';

export async function cachedJson<T>(key: string, ttlMs: number, loader: () => Promise<T>) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const filePath = path.join(CACHE_DIR, `${safeKey(key)}.json`);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const entry = JSON.parse(raw) as { savedAt: number; data: T };
    if (Date.now() - entry.savedAt < ttlMs) {
      return { data: entry.data, cache: 'hit' as const, savedAt: entry.savedAt };
    }
  } catch {
    // Cache miss.
  }

  const data = await loader();
  const savedAt = Date.now();
  await fs.writeFile(filePath, JSON.stringify({ savedAt, data }, null, 2));
  return { data, cache: 'miss' as const, savedAt };
}

function safeKey(key: string) {
  return key.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
}
