import { cachedJson } from '../cache.js';
import type { ScannerConfig } from '../config.js';
import type { SourcePrice } from '../types.js';

interface RustTmItem {
  market_hash_name?: string;
  price?: string | number;
  volume?: string | number;
}

export async function loadRustTmPrices(config: ScannerConfig): Promise<SourcePrice[]> {
  const currency = ['USD', 'EUR', 'RUB'].includes(config.currency) ? config.currency : 'USD';
  const result = await cachedJson('rusttm_prices_' + currency, config.requestPolicy.rusttmCacheMs, async () => {
    const response = await fetch(`https://rust.tm/api/v2/prices/${currency}.json`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'realm-riches-rust-screener/0.2 read-only',
      },
    });

    if (!response.ok) {
      throw new Error(`rust.tm failed: HTTP ${response.status}`);
    }

    return response.json() as Promise<{ items?: RustTmItem[] }>;
  });

  return (result.data.items || [])
    .map((item) => {
      const price = Number(item.price);
      if (!item.market_hash_name || !Number.isFinite(price) || price <= 0) return null;

      return {
        market: 'rusttm',
        itemName: item.market_hash_name,
        buyPrice: price,
        sellPrice: price,
        sales24h: null,
        listedCount: Number(item.volume || 0),
        currency,
        url: `https://rust.tm/item/${encodeURIComponent(item.market_hash_name)}`,
      } satisfies SourcePrice;
    })
    .filter(Boolean) as SourcePrice[];
}
