import { cachedJson } from '../cache.js';
import type { ScannerConfig } from '../config.js';
import type { SourcePrice } from '../types.js';

const RUST_APP_ID = 252490;

interface SkinportItem {
  market_hash_name?: string;
  min_price?: string | number;
  suggested_price?: string | number;
  mean_price?: string | number;
  sales_24h?: string | number;
  quantity?: string | number;
  item_page?: string;
}

export async function loadSkinportPrices(config: ScannerConfig): Promise<SourcePrice[]> {
  const url = new URL('https://api.skinport.com/v1/items');
  url.searchParams.set('app_id', String(RUST_APP_ID));
  url.searchParams.set('currency', config.currency);

  const result = await cachedJson('skinport_items_rust_' + config.currency, config.requestPolicy.skinportCacheMs, async () => {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'br',
        'User-Agent': 'realm-riches-rust-screener/0.2 read-only',
      },
    });

    if (!response.ok) {
      throw new Error(`Skinport failed: HTTP ${response.status}`);
    }

    return response.json() as Promise<SkinportItem[]>;
  });

  return (result.data || [])
    .filter((item) => item.market_hash_name && Number.isFinite(Number(item.min_price)))
    .map((item) => ({
      market: 'skinport',
      itemName: item.market_hash_name!,
      buyPrice: Number(item.min_price),
      sellPrice: Number(item.suggested_price || item.mean_price || item.min_price),
      sales24h: Number.isFinite(Number(item.sales_24h)) ? Number(item.sales_24h) : null,
      salesSource: Number.isFinite(Number(item.sales_24h)) ? 'Skinport 24h sales' : null,
      listedCount: Number(item.quantity || 0),
      currency: config.currency,
      url: item.item_page || `https://skinport.com/market?search=${encodeURIComponent(item.market_hash_name!)}`,
    }));
}
