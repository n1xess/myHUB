type Risk = "lower" | "medium" | "high" | "loss";
type Result = "profit" | "loss" | "flat";

interface ScannerConfig {
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

interface SourcePrice {
  market: string;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  currency: string;
  url: string;
  sales24h?: number | null;
  salesSource?: string | null;
  orderCount?: number | null;
  listedCount?: number | null;
  rate?: number | null;
  priceHistory?: PriceHistoryPoint[];
}

interface PriceHistoryPoint {
  date: string;
  price: number;
  sales?: number | null;
}

interface PlatformQuote {
  market: string;
  buyPrice: number;
  sellPrice: number;
  feePercent: number;
  netSellPrice: number;
  sales24h: number | null;
  salesSource: string | null;
  orderCount: number | null;
  listedCount: number | null;
  priceHistory: PriceHistoryPoint[];
  url: string;
}

interface Opportunity {
  itemName: string;
  buyMarket: string;
  sellMarket: string;
  buyPrice: number;
  sellPrice: number;
  buyFeePercent: number;
  sellFeePercent: number;
  revenueAfterFee: number;
  netProfit: number;
  roiPercent: number;
  result: Result;
  liquidityScore: number;
  spreadPercent: number;
  risk: Risk;
  buyUrl: string;
  sellUrl: string;
  platformQuotes: PlatformQuote[];
  platformStats: { min: number; max: number; avg: number };
  signals: string[];
}

const RUST_APP_ID = 252490;
const memoryCache = new Map<string, { savedAt: number; data: unknown }>();

const defaultWatchlist = [
  "Tempered AK47",
  "No Mercy AK47",
  "Glory AK47",
  "Alien Red",
  "Big Grin",
  "Metal Facemask",
  "Tempered Mp5",
  "Punishment Mask",
  "Whiteout Hoodie",
  "Blackout Chestplate",
  "Bombing Facemask",
  "Creepy Clown Bandana",
];

export function getScannerConfig(): ScannerConfig {
  return {
    currency: process.env.SCAN_CURRENCY || "USD",
    steamCountry: process.env.STEAM_COUNTRY || "US",
    steamEnabled: parseBool(process.env.STEAM_ENABLED, true),
    skinportEnabled: parseBool(process.env.SKINPORT_ENABLED, false),
    dmarketEnabled: parseBool(process.env.DMARKET_ENABLED, true),
    rusttmEnabled: parseBool(process.env.RUSTTM_ENABLED, true),
    lootfarmEnabled: parseBool(process.env.LOOTFARM_ENABLED, true),
    maxOpportunities: Number(process.env.MAX_OPPORTUNITIES || 5000),
    knownMarkets: ["steam", "dmarket", "rusttm", "lootfarm", "tradeit-trade", "tradeit-store", "lis-skins", "skinport"],
    fees: {
      steam: 0.15,
      skinport: 0.12,
      dmarket: 0.1,
      rusttm: 0.05,
      lootfarm: 0.05,
      "tradeit-trade": 0.08,
      "tradeit-store": 0.08,
      "lis-skins": 0.05,
    },
    requestPolicy: {
      skinportCacheMs: 5 * 60 * 1000,
      dmarketCacheMs: 5 * 60 * 1000,
      rusttmCacheMs: 10 * 60 * 1000,
      lootfarmCacheMs: 60 * 1000,
      steamCacheMs: 20 * 60 * 1000,
      steamDelayMs: Number(process.env.STEAM_DELAY_MS || 1200),
    },
  };
}

export async function runScan() {
  const config = getScannerConfig();
  const watchlist = getWatchlist();
  const sources: Promise<LoadResult>[] = [];
  const errors: string[] = [];

  if (config.skinportEnabled) sources.push(loadSource("skinport", () => loadSkinportPrices(config, watchlist)));
  if (config.dmarketEnabled) sources.push(loadSource("dmarket", () => loadDmarketPrices(config, watchlist)));
  if (config.rusttmEnabled) sources.push(loadSource("rusttm", () => loadRustTmPrices(config, watchlist)));
  if (config.lootfarmEnabled) sources.push(loadSource("lootfarm", () => loadLootFarmPrices(config, watchlist)));
  if (config.steamEnabled) sources.push(loadSource("steam", () => loadSteamPrices(config, watchlist)));

  const settled = await Promise.all(sources);
  const prices: SourcePrice[] = [];
  for (const result of settled) {
    if (result.ok) prices.push(...result.rows);
    else errors.push(result.error);
  }

  const opportunities = findOpportunities(prices, config.fees).slice(0, config.maxOpportunities);
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

function getWatchlist() {
  const raw = process.env.SCREENER_WATCHLIST;
  if (!raw?.trim()) return defaultWatchlist;
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

async function cachedJson<T>(key: string, ttlMs: number, loader: () => Promise<T>) {
  const safeKey = key.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase();
  const cached = memoryCache.get(safeKey);
  if (cached && Date.now() - cached.savedAt < ttlMs) return cached.data as T;

  const data = await loader();
  memoryCache.set(safeKey, { savedAt: Date.now(), data });
  return data;
}

async function loadSource(name: string, loader: () => Promise<SourcePrice[]>): Promise<LoadResult> {
  try {
    const rows = await loader();
    return { ok: true, rows };
  } catch (error) {
    return { ok: false, error: `${name}: ${(error as Error).message}` };
  }
}

async function loadSteamPrices(config: ScannerConfig, watchlist: string[]): Promise<SourcePrice[]> {
  const rows: SourcePrice[] = [];

  for (const itemName of watchlist) {
    const data = await cachedJson(`steam_${config.currency}_${config.steamCountry}_${itemName}`, config.requestPolicy.steamCacheMs, async () => {
      await sleep(config.requestPolicy.steamDelayMs);
      const url = new URL("https://steamcommunity.com/market/priceoverview/");
      url.searchParams.set("appid", String(RUST_APP_ID));
      url.searchParams.set("currency", steamCurrencyCode(config.currency));
      url.searchParams.set("country", config.steamCountry);
      url.searchParams.set("market_hash_name", itemName);

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "realm-riches-rust-screener/0.3 read-only",
        },
      });

      if (!response.ok) throw new Error(`Steam failed for ${itemName}: HTTP ${response.status}`);
      return response.json() as Promise<Record<string, unknown>>;
    });

    const lowest = parsePrice(data.lowest_price);
    const median = parsePrice(data.median_price);
    const volume = Number.parseInt(String(data.volume || "0").replace(/[^\d]/g, ""), 10) || 0;

    if (data.success && lowest) {
      rows.push({
        market: "steam",
        itemName,
        buyPrice: lowest,
        sellPrice: median || lowest,
        sales24h: volume || null,
        salesSource: volume ? "Steam 24h volume" : null,
        listedCount: null,
        currency: config.currency,
        url: `https://steamcommunity.com/market/listings/${RUST_APP_ID}/${encodeURIComponent(itemName)}`,
      });
    }
  }

  return rows;
}

async function loadDmarketPrices(config: ScannerConfig, watchlist: string[]): Promise<SourcePrice[]> {
  if (!watchlist.length) return [];

  const data = await cachedJson("dmarket_aggregated_rust_" + config.currency, config.requestPolicy.dmarketCacheMs, async () => {
    const response = await fetch("https://api.dmarket.com/marketplace-api/v1/aggregated-prices", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "realm-riches-rust-screener/0.3 read-only",
      },
      body: JSON.stringify({
        cursor: "",
        limit: String(Math.min(watchlist.length, 100)),
        filter: { game: "rust", titles: watchlist },
      }),
    });

    if (!response.ok) throw new Error(`DMarket failed: HTTP ${response.status}`);
    return response.json() as Promise<{ aggregatedPrices?: DmarketAggregatedItem[] }>;
  });

  return (data.aggregatedPrices || [])
    .map((item) => {
      const buyPrice = dmarketAmount(item.offerBestPrice?.Amount);
      if (!item.title || !buyPrice) return null;
      const sellPrice = dmarketAmount(item.orderBestPrice?.Amount) || buyPrice;
      return {
        market: "dmarket",
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

async function loadLootFarmPrices(config: ScannerConfig, watchlist: string[]): Promise<SourcePrice[]> {
  const watched = watchlistMatcher(watchlist);
  const data = await cachedJson("lootfarm_fullprice_rust", config.requestPolicy.lootfarmCacheMs, async () => {
    const response = await fetch("https://loot.farm/fullpriceRUST.json", {
      headers: { Accept: "application/json", "User-Agent": "realm-riches-rust-screener/0.3 read-only" },
    });
    if (!response.ok) throw new Error(`LootFarm failed: HTTP ${response.status}`);
    return response.json() as Promise<LootFarmItem[]>;
  });

  return (data || [])
    .filter((item) => item.name && watched(item.name))
    .map((item) => {
      const price = Number(item.price) / 100;
      if (!item.name || !Number.isFinite(price) || price <= 0) return null;
      return {
        market: "lootfarm",
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

async function loadRustTmPrices(config: ScannerConfig, watchlist: string[]): Promise<SourcePrice[]> {
  const watched = watchlistMatcher(watchlist);
  const currency = ["USD", "EUR", "RUB"].includes(config.currency) ? config.currency : "USD";
  const data = await cachedJson("rusttm_prices_" + currency, config.requestPolicy.rusttmCacheMs, async () => {
    const response = await fetch(`https://rust.tm/api/v2/prices/${currency}.json`, {
      headers: { Accept: "application/json", "User-Agent": "realm-riches-rust-screener/0.3 read-only" },
    });
    if (!response.ok) throw new Error(`rust.tm failed: HTTP ${response.status}`);
    return response.json() as Promise<{ items?: RustTmItem[] }>;
  });

  return (data.items || [])
    .filter((item) => item.market_hash_name && watched(item.market_hash_name))
    .map((item) => {
      const price = Number(item.price);
      if (!item.market_hash_name || !Number.isFinite(price) || price <= 0) return null;
      return {
        market: "rusttm",
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

async function loadSkinportPrices(config: ScannerConfig, watchlist: string[]): Promise<SourcePrice[]> {
  const watched = watchlistMatcher(watchlist);
  const url = new URL("https://api.skinport.com/v1/items");
  url.searchParams.set("app_id", String(RUST_APP_ID));
  url.searchParams.set("currency", config.currency);

  const data = await cachedJson("skinport_items_rust_" + config.currency, config.requestPolicy.skinportCacheMs, async () => {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "br",
        "User-Agent": "realm-riches-rust-screener/0.3 read-only",
      },
    });
    if (!response.ok) throw new Error(`Skinport failed: HTTP ${response.status}`);
    return response.json() as Promise<SkinportItem[]>;
  });

  return (data || [])
    .filter((item) => item.market_hash_name && watched(item.market_hash_name) && Number.isFinite(Number(item.min_price)))
    .map((item) => ({
      market: "skinport",
      itemName: item.market_hash_name!,
      buyPrice: Number(item.min_price),
      sellPrice: Number(item.suggested_price || item.mean_price || item.min_price),
      sales24h: Number.isFinite(Number(item.sales_24h)) ? Number(item.sales_24h) : null,
      salesSource: Number.isFinite(Number(item.sales_24h)) ? "Skinport 24h sales" : null,
      listedCount: Number(item.quantity || 0),
      currency: config.currency,
      url: item.item_page || `https://skinport.com/market?search=${encodeURIComponent(item.market_hash_name!)}`,
    }));
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

function buildPlatformQuotes(rows: SourcePrice[], fees: Record<string, number>): PlatformQuote[] {
  return rows
    .map((row) => {
      const fee = fees[row.market] ?? 0.1;
      return {
        market: row.market,
        buyPrice: roundMoney(row.buyPrice),
        sellPrice: roundMoney(row.sellPrice),
        feePercent: roundMoney(fee * 100),
        netSellPrice: roundMoney(row.sellPrice * (1 - fee)),
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
  return { min: roundMoney(Math.min(...values)), max: roundMoney(Math.max(...values)), avg: roundMoney(sum / values.length) };
}

function scoreDeal(deal: Opportunity) {
  const directionScore = deal.netProfit >= 0 ? 1000 : 0;
  const profitScore = Math.log10(Math.abs(deal.netProfit) + 1) * 38;
  const roiScore = clamp(Math.abs(deal.roiPercent), 0, 150) * 0.35;
  const liquidityScore = deal.liquidityScore * 0.35;
  const spreadPenalty = Math.max(0, Math.abs(deal.spreadPercent) - 120) * 0.2;
  return directionScore + profitScore + roiScore + liquidityScore - spreadPenalty;
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

function buildSignals(buy: SourcePrice, sell: SourcePrice, liquidityScore: number, spreadPercent: number) {
  const signals: string[] = [];
  if (spreadPercent > 100) signals.push("extreme spread - verify manually");
  else if (spreadPercent < -50) signals.push("deep loss route");
  if (liquidityScore >= 70) signals.push("good liquidity");
  if (liquidityScore < 45) signals.push("thin market");
  if (spreadPercent > 30) signals.push("wide spread");
  if ((sell.sales24h || 0) > (buy.sales24h || 0)) signals.push("stronger sell-side sales");
  else if ((sell.orderCount || 0) > (buy.orderCount || 0)) signals.push("stronger sell-side order depth");
  return signals;
}

function riskLabel(liquidityScore: number, spreadPercent: number, roiPercent: number): Risk {
  if (roiPercent < 0) return "loss";
  if (liquidityScore >= 70 && spreadPercent <= 18 && roiPercent <= 25) return "lower";
  if (liquidityScore >= 45 && spreadPercent <= 35) return "medium";
  return "high";
}

function resultLabel(netProfit: number): Result {
  if (netProfit > 0) return "profit";
  if (netProfit < 0) return "loss";
  return "flat";
}

function watchlistMatcher(watchlist: string[]) {
  const normalized = new Set(watchlist.map(normalizeName));
  return (itemName: string) => normalized.has(normalizeName(itemName));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePrice(value: unknown) {
  if (typeof value === "number") return value;
  if (!value) return null;
  const cleaned = String(value).replace(/[^\d.,-]/g, "");
  const normalized = cleaned.includes(".") && cleaned.includes(",") ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeName(name: string) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function steamCurrencyCode(currency: string) {
  const codes: Record<string, string> = { USD: "1", GBP: "2", EUR: "3", UAH: "18" };
  return codes[currency] || codes.USD;
}

function parseBool(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function dmarketAmount(amount: string | number | undefined) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed / 100;
}

interface DmarketAggregatedItem {
  title?: string;
  offerBestPrice?: { Amount?: string | number };
  orderBestPrice?: { Amount?: string | number };
  orderCount?: string | number;
  offerCount?: string | number;
}

interface LootFarmItem {
  name?: string;
  price?: string | number;
  have?: string | number;
  rate?: string | number;
}

interface RustTmItem {
  market_hash_name?: string;
  price?: string | number;
  volume?: string | number;
}

interface SkinportItem {
  market_hash_name?: string;
  min_price?: string | number;
  suggested_price?: string | number;
  mean_price?: string | number;
  sales_24h?: string | number;
  quantity?: string | number;
  item_page?: string;
}

type LoadResult = { ok: true; rows: SourcePrice[] } | { ok: false; error: string };
