import { cachedJson } from '../cache.js';
import type { ScannerConfig } from '../config.js';
import type { SourcePrice } from '../types.js';

interface DmarketAggregatedItem {
  title?: string;
  offerBestPrice?: { Amount?: string | number };
  orderBestPrice?: { Amount?: string | number };
  orderCount?: string | number;
  offerCount?: string | number;
}

export async function loadDmarketPrices(config: ScannerConfig, watchlist: string[]): Promise<SourcePrice[]> {
  if (!watchlist.length) return [];

  const result = await cachedJson('dmarket_aggregated_rust_' + config.currency, config.requestPolicy.dmarketCacheMs, async () => {
    const response = await fetch('https://api.dmarket.com/marketplace-api/v1/aggregated-prices', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'realm-riches-rust-screener/0.2 read-only',
      },
      body: JSON.stringify({
        cursor: '',
        limit: String(Math.min(watchlist.length, 100)),
        filter: {
          game: 'rust',
          titles: watchlist,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`DMarket failed: HTTP ${response.status}`);
    }

    return response.json() as Promise<{ aggregatedPrices?: DmarketAggregatedItem[] }>;
  });

  return (result.data.aggregatedPrices || [])
    .map((item) => {
      const buyPrice = dmarketAmount(item.offerBestPrice?.Amount);
      if (!item.title || !buyPrice) return null;
      const sellPrice = dmarketAmount(item.orderBestPrice?.Amount) || buyPrice;

      return {
        market: 'dmarket',
        itemName: item.title,
        buyPrice,
        sellPrice,
        sales24h: null,
        orderCount: Number(item.orderCount || 0),
        listedCount: Number(item.offerCount || 0),
        currency: config.currency,
        url: `https://dmarket.com/ingame-items/item-list/rust-skins?title=${encodeURIComponent(item.title)}`,
      } satisfies SourcePrice;
    })
    .filter(Boolean) as SourcePrice[];
}

function dmarketAmount(amount: string | number | undefined) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed / 100;
}
