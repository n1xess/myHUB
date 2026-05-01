export type GameType = "CS2" | "Dota2" | "Rust";
export type TradeType = "buy" | "sell" | "pending";

export interface Trade {
  id: string;
  game: GameType;
  item_name: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  trade_type: TradeType;
  trade_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TradeInsert = Omit<Trade, "id" | "created_at" | "updated_at">;

export interface PortfolioItem {
  id: string;
  game: GameType;
  item_name: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number | null;
  created_at: string;
  updated_at: string;
}

export type PortfolioInsert = Omit<PortfolioItem, "id" | "created_at" | "updated_at">;

export interface TradeCircle {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  trades: Trade[];
}

export interface TradeCircleInsert {
  name: string;
  notes?: string | null;
  tradeIds?: string[];
}

export interface TradeCircleUpdate {
  id: string;
  name?: string;
  notes?: string | null;
  tradeIds?: string[];
}

export const GAMES: GameType[] = ["CS2", "Dota2", "Rust"];
export const GAME_COLORS: Record<GameType, string> = {
  CS2: "hsl(217, 91%, 60%)",
  Dota2: "hsl(0, 72%, 51%)",
  Rust: "hsl(25, 95%, 53%)",
};

export interface ScreenerPriceHistoryPoint {
  date: string;
  price: number;
  sales?: number | null;
}

export interface ScreenerPlatformQuote {
  market: string;
  buyPrice: number;
  sellPrice: number;
  feePercent: number;
  netSellPrice: number;
  sales24h: number | null;
  salesSource: string | null;
  orderCount: number | null;
  listedCount: number | null;
  priceHistory: ScreenerPriceHistoryPoint[];
  url: string;
}

export interface ScreenerOpportunity {
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
  result: "profit" | "loss" | "flat";
  liquidityScore: number;
  spreadPercent: number;
  risk: "lower" | "medium" | "high" | "loss";
  buyUrl: string;
  sellUrl: string;
  platformQuotes: ScreenerPlatformQuote[];
  platformStats: { min: number; max: number; avg: number };
  signals: string[];
}

export interface ScreenerScanResult {
  scannedAt: string;
  config: {
    currency: string;
    maxOpportunities: number;
    fees: Record<string, number>;
    enabledSources: Record<string, boolean>;
  };
  counts: {
    prices: number;
    opportunities: number;
  };
  errors: string[];
  availableMarkets: string[];
  opportunities: ScreenerOpportunity[];
}

export const TRADE_TYPE_COLORS: Record<TradeType, string> = {
  buy: "hsl(142, 76%, 36%)",
  sell: "hsl(0, 72%, 51%)",
  pending: "hsl(45, 93%, 47%)",
};
