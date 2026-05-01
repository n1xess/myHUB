import { cachedJson } from '../cache.js';
import type { ScannerConfig } from '../config.js';
import { parsePrice, sleep } from '../utils.js';
import type { SourcePrice } from '../types.js';

const RUST_APP_ID = 252490;

export async function loadSteamPrices(config: ScannerConfig, watchlist: string[]): Promise<SourcePrice[]> {
  const rows: SourcePrice[] = [];

  for (const itemName of watchlist) {
    const cacheKey = `steam_${config.currency}_${config.steamCountry}_${itemName}`;
    const result = await cachedJson(cacheKey, config.requestPolicy.steamCacheMs, async () => {
      await sleep(config.requestPolicy.steamDelayMs);
      const url = new URL('https://steamcommunity.com/market/priceoverview/');
      url.searchParams.set('appid', String(RUST_APP_ID));
      url.searchParams.set('currency', steamCurrencyCode(config.currency));
      url.searchParams.set('country', config.steamCountry);
      url.searchParams.set('market_hash_name', itemName);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'realm-riches-rust-screener/0.2 read-only',
        },
      });

      if (!response.ok) {
        throw new Error(`Steam failed for ${itemName}: HTTP ${response.status}`);
      }

      return response.json() as Promise<Record<string, unknown>>;
    });

    const data = result.data;
    const lowest = parsePrice(data.lowest_price);
    const median = parsePrice(data.median_price);
    const volume = Number.parseInt(String(data.volume || '0').replace(/[^\d]/g, ''), 10) || 0;

    if (data.success && lowest) {
      rows.push({
        market: 'steam',
        itemName,
        buyPrice: lowest,
        sellPrice: median || lowest,
        sales24h: volume || null,
        salesSource: volume ? 'Steam 24h volume' : null,
        listedCount: null,
        currency: config.currency,
        url: `https://steamcommunity.com/market/listings/${RUST_APP_ID}/${encodeURIComponent(itemName)}`,
      });
    }
  }

  return rows;
}

function steamCurrencyCode(currency: string) {
  const codes: Record<string, string> = {
    USD: '1',
    GBP: '2',
    EUR: '3',
    UAH: '18',
  };
  return codes[currency] || codes.USD;
}
