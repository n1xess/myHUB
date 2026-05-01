import { cachedJson } from '../cache.js';
import type { ScannerConfig } from '../config.js';
import type { SourcePrice } from '../types.js';

interface LootFarmItem {
  name?: string;
  price?: string | number;
  have?: string | number;
  rate?: string | number;
}

export async function loadLootFarmPrices(config: ScannerConfig): Promise<SourcePrice[]> {
  const result = await cachedJson('lootfarm_fullprice_rust', config.requestPolicy.lootfarmCacheMs, async () => {
    const response = await fetch('https://loot.farm/fullpriceRUST.json', {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'realm-riches-rust-screener/0.2 read-only',
      },
    });

    if (!response.ok) {
      throw new Error(`LootFarm failed: HTTP ${response.status}`);
    }

    return response.json() as Promise<LootFarmItem[]>;
  });

  return (result.data || [])
    .map((item) => {
      const price = Number(item.price) / 100;
      if (!item.name || !Number.isFinite(price) || price <= 0) return null;

      return {
        market: 'lootfarm',
        itemName: item.name,
        buyPrice: price,
        sellPrice: price,
        sales24h: null,
        rate: Number(item.rate || 0),
        listedCount: Number(item.have || 0),
        currency: config.currency,
        url: `https://loot.farm/#skin=252490_${encodeURIComponent(item.name)}`,
      } satisfies SourcePrice;
    })
    .filter(Boolean) as SourcePrice[];
}
