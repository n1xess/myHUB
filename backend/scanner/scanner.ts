import path from 'path';
import { DATA_DIR, getScannerConfig, readJson } from './config.js';
import { loadDmarketPrices } from './sources/dmarket.js';
import { loadLootFarmPrices } from './sources/lootfarm.js';
import { loadRustTmPrices } from './sources/rusttm.js';
import { loadSkinportPrices } from './sources/skinport.js';
import { loadSteamPrices } from './sources/steam.js';
import type { Opportunity, PlatformQuote, SourcePrice } from './types.js';
import { clamp, normalizeName, roundMoney } from './utils.js';

export async function runScan() {
  const config = getScannerConfig();
  const watchlist = await readJson<string[]>(path.join(DATA_DIR, 'watchlist.json'), []);
  const sources: Promise<LoadResult>[] = [];
  const errors: string[] = [];

  if (config.skinportEnabled) {
    sources.push(loadSource('skinport', () => loadSkinportPrices(config)));
  }

  if (config.dmarketEnabled) {
    sources.push(loadSource('dmarket', () => loadDmarketPrices(config, watchlist)));
  }

  if (config.rusttmEnabled) {
    sources.push(loadSource('rusttm', () => loadRustTmPrices(config)));
  }

  if (config.lootfarmEnabled) {
    sources.push(loadSource('lootfarm', () => loadLootFarmPrices(config)));
  }

  if (config.steamEnabled) {
    sources.push(loadSource('steam', () => loadSteamPrices(config, watchlist)));
  }

  const settled = await Promise.all(sources);
  const prices: SourcePrice[] = [];
  for (const result of settled) {
    if (result.ok) prices.push(...result.rows);
    else errors.push(result.error);
  }

  const opportunities = findOpportunities(prices, config.fees)
    .slice(0, config.maxOpportunities);
  const availableMarkets = [...new Set([...config.knownMarkets, ...prices.map((price) => price.market)])].sort();

  return {
    scannedAt: new Date().toISOString(),
    config: {
      currency: config.currency,
      maxOpportunities: config.maxOpportunities,
      fees: config.fees,
      enabledSources: {
        skinport: config.skinportEnabled,
        dmarket: config.dmarketEnabled,
        rusttm: config.rusttmEnabled,
        lootfarm: config.lootfarmEnabled,
        steam: config.steamEnabled,
      },
    },
    counts: {
      prices: prices.length,
      opportunities: opportunities.length,
    },
    errors,
    availableMarkets,
    opportunities,
  };
}

function findOpportunities(prices: SourcePrice[], fees: Record<string, number>) {
  const byItem = new Map<string, SourcePrice[]>();
  for (const row of prices) {
    if (!row.buyPrice || !row.sellPrice) continue;
    const key = normalizeName(row.itemName);
    if (!byItem.has(key)) byItem.set(key, []);
    byItem.get(key)!.push(row);
  }

  const deals: Opportunity[] = [];
  for (const rows of byItem.values()) {
    for (const buy of rows) {
      for (const sell of rows) {
        if (buy.market === sell.market) continue;
        const sellFee = fees[sell.market] ?? 0.1;
        const revenueAfterFee = sell.sellPrice * (1 - sellFee);
        const netProfit = revenueAfterFee - buy.buyPrice;
        const roiPercent = (netProfit / buy.buyPrice) * 100;
        if (!Number.isFinite(roiPercent)) continue;

        const spreadPercent = ((sell.sellPrice - buy.buyPrice) / buy.buyPrice) * 100;
        const liquidityScore = scoreLiquidity(buy, sell, spreadPercent);
        const platformQuotes = buildPlatformQuotes(rows, fees);

        deals.push({
          itemName: buy.itemName,
          buyMarket: buy.market,
          sellMarket: sell.market,
          buyPrice: roundMoney(buy.buyPrice),
          sellPrice: roundMoney(sell.sellPrice),
          buyFeePercent: roundMoney((fees[buy.market] ?? 0) * 100),
          sellFeePercent: roundMoney(sellFee * 100),
          revenueAfterFee: roundMoney(revenueAfterFee),
          netProfit: roundMoney(netProfit),
          roiPercent: roundMoney(roiPercent),
          result: resultLabel(netProfit),
          liquidityScore,
          spreadPercent: roundMoney(spreadPercent),
          risk: riskLabel(liquidityScore, spreadPercent, roiPercent),
          buyUrl: buy.url,
          sellUrl: sell.url,
          platformQuotes,
          platformStats: buildPlatformStats(platformQuotes),
          signals: buildSignals(buy, sell, liquidityScore, spreadPercent),
        });
      }
    }
  }

  return deals.sort((a, b) => scoreDeal(b) - scoreDeal(a));
}

function scoreDeal(deal: Opportunity) {
  const directionScore = deal.netProfit >= 0 ? 1000 : 0;
  const profitScore = Math.log10(Math.abs(deal.netProfit) + 1) * 38;
  const roiScore = clamp(Math.abs(deal.roiPercent), 0, 150) * 0.35;
  const liquidityScore = deal.liquidityScore * 0.35;
  const spreadPenalty = Math.max(0, Math.abs(deal.spreadPercent) - 120) * 0.2;
  return directionScore + profitScore + roiScore + liquidityScore - spreadPenalty;
}

function buildPlatformQuotes(rows: SourcePrice[], fees: Record<string, number>): PlatformQuote[] {
  return rows
    .map((row) => {
      const fee = fees[row.market] ?? 0.1;
      const netSellPrice = row.sellPrice * (1 - fee);
      return {
        market: row.market,
        buyPrice: roundMoney(row.buyPrice),
        sellPrice: roundMoney(row.sellPrice),
        feePercent: roundMoney(fee * 100),
        netSellPrice: roundMoney(netSellPrice),
        sales24h: numberOrNull(row.sales24h),
        salesSource: row.salesSource || null,
        orderCount: numberOrNull(row.orderCount),
        listedCount: numberOrNull(row.listedCount),
        priceHistory: Array.isArray(row.priceHistory) ? row.priceHistory : [],
        url: row.url,
      };
    })
    .sort((a, b) => b.netSellPrice - a.netSellPrice);
}

function buildPlatformStats(quotes: PlatformQuote[]) {
  const values = quotes.map((quote) => quote.netSellPrice).filter((value) => Number.isFinite(value));
  if (!values.length) return { min: 0, max: 0, avg: 0 };
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    min: roundMoney(Math.min(...values)),
    max: roundMoney(Math.max(...values)),
    avg: roundMoney(sum / values.length),
  };
}

async function loadSource(name: string, loader: () => Promise<SourcePrice[]>): Promise<LoadResult> {
  try {
    const rows = await loader();
    return { ok: true, rows };
  } catch (error) {
    return { ok: false, error: `${name}: ${(error as Error).message}` };
  }
}

function scoreLiquidity(buy: SourcePrice, sell: SourcePrice, spreadPercent: number) {
  const sales = Math.max(Number(buy.sales24h || 0), Number(sell.sales24h || 0));
  const orders = Math.max(Number(buy.orderCount || 0), Number(sell.orderCount || 0));
  const listed = Math.max(Number(buy.listedCount || 0), Number(sell.listedCount || 0));
  const salesScore = clamp(Math.log10(sales + 1) * 34, 0, 55);
  const orderScore = clamp(Math.log10(orders + 1) * 18, 0, 20);
  const listedScore = clamp(Math.log10(listed + 1) * 22, 0, 30);
  const spreadPenalty = clamp(Math.abs(spreadPercent - 8) * 0.7, 0, 20);
  return Math.round(clamp(salesScore + orderScore + listedScore + 20 - spreadPenalty, 0, 100));
}

function riskLabel(liquidityScore: number, spreadPercent: number, roiPercent: number): Opportunity['risk'] {
  if (roiPercent < 0) return 'loss';
  if (liquidityScore >= 70 && spreadPercent <= 18 && roiPercent <= 25) return 'lower';
  if (liquidityScore >= 45 && spreadPercent <= 35) return 'medium';
  return 'high';
}

function resultLabel(netProfit: number): Opportunity['result'] {
  if (netProfit > 0) return 'profit';
  if (netProfit < 0) return 'loss';
  return 'flat';
}

function buildSignals(buy: SourcePrice, sell: SourcePrice, liquidityScore: number, spreadPercent: number) {
  const signals: string[] = [];
  if (spreadPercent > 100) signals.push('extreme spread - verify manually');
  else if (spreadPercent < -50) signals.push('deep loss route');
  if (liquidityScore >= 70) signals.push('good liquidity');
  if (liquidityScore < 45) signals.push('thin market');
  if (spreadPercent > 30) signals.push('wide spread');
  if ((sell.sales24h || 0) > (buy.sales24h || 0)) signals.push('stronger sell-side sales');
  else if ((sell.orderCount || 0) > (buy.orderCount || 0)) signals.push('stronger sell-side order depth');
  return signals;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type LoadResult =
  | { ok: true; rows: SourcePrice[] }
  | { ok: false; error: string };
