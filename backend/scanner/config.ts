import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url)).replace(/[\\/]scanner$/, '');
export const DATA_DIR = path.join(BACKEND_DIR, 'data');
export const CACHE_DIR = path.join(DATA_DIR, 'scanner-cache');

export interface ScannerConfig {
  currency: string;
  steamCountry: string;
  steamEnabled: boolean;
  skinportEnabled: boolean;
  dmarketEnabled: boolean;
  rusttmEnabled: boolean;
  lootfarmEnabled: boolean;
  maxOpportunities: number;
  knownMarkets: string[];
  fees: Record<string, number>;
  requestPolicy: {
    skinportCacheMs: number;
    dmarketCacheMs: number;
    rusttmCacheMs: number;
    lootfarmCacheMs: number;
    steamCacheMs: number;
    steamDelayMs: number;
  };
}

export function getScannerConfig(): ScannerConfig {
  return {
    currency: process.env.SCAN_CURRENCY || 'USD',
    steamCountry: process.env.STEAM_COUNTRY || 'US',
    steamEnabled: parseBool(process.env.STEAM_ENABLED, true),
    skinportEnabled: parseBool(process.env.SKINPORT_ENABLED, false),
    dmarketEnabled: parseBool(process.env.DMARKET_ENABLED, true),
    rusttmEnabled: parseBool(process.env.RUSTTM_ENABLED, true),
    lootfarmEnabled: parseBool(process.env.LOOTFARM_ENABLED, true),
    maxOpportunities: Number(process.env.MAX_OPPORTUNITIES || 20000),
    knownMarkets: [
      'steam',
      'dmarket',
      'rusttm',
      'lootfarm',
      'tradeit-trade',
      'tradeit-store',
      'lis-skins',
      'skinport',
    ],
    fees: {
      steam: 0.15,
      skinport: 0.12,
      dmarket: 0.1,
      rusttm: 0.05,
      lootfarm: 0.05,
      'tradeit-trade': 0.08,
      'tradeit-store': 0.08,
      'lis-skins': 0.05,
    },
    requestPolicy: {
      skinportCacheMs: 5 * 60 * 1000,
      dmarketCacheMs: 5 * 60 * 1000,
      rusttmCacheMs: 10 * 60 * 1000,
      lootfarmCacheMs: 60 * 1000,
      steamCacheMs: 20 * 60 * 1000,
      steamDelayMs: 2500,
    },
  };
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseBool(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}
