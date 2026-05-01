export interface SourcePrice {
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

export interface PriceHistoryPoint {
  date: string;
  price: number;
  sales?: number | null;
}

export interface PlatformQuote {
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

export interface Opportunity {
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
  result: 'profit' | 'loss' | 'flat';
  liquidityScore: number;
  spreadPercent: number;
  risk: 'lower' | 'medium' | 'high' | 'loss';
  buyUrl: string;
  sellUrl: string;
  platformQuotes: PlatformQuote[];
  platformStats: { min: number; max: number; avg: number };
  signals: string[];
}
