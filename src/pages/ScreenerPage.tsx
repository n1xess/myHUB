import { Fragment, useMemo, useState } from "react";
import { RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ScreenerOpportunity, ScreenerPlatformQuote, ScreenerScanResult } from "@/lib/types";

type SortMode = "score" | "roiDesc" | "profitDesc" | "lossAsc" | "spreadDesc";

const emptyScan: ScreenerScanResult = {
  scannedAt: "",
  config: { currency: "USD", maxOpportunities: 0, fees: {}, enabledSources: {} },
  counts: { prices: 0, opportunities: 0 },
  errors: [],
  availableMarkets: [],
  opportunities: [],
};

export default function ScreenerPage() {
  const [scan, setScan] = useState<ScreenerScanResult>(emptyScan);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [buyMarket, setBuyMarket] = useState("");
  const [sellMarket, setSellMarket] = useState("");
  const [risk, setRisk] = useState("");
  const [result, setResult] = useState("");
  const [sort, setSort] = useState<SortMode>("score");
  const [minBuy, setMinBuy] = useState("");
  const [maxBuy, setMaxBuy] = useState("");
  const [minRoi, setMinRoi] = useState("");
  const [minLiquidity, setMinLiquidity] = useState("");
  const [maxSpread, setMaxSpread] = useState("");
  const [error, setError] = useState("");

  const markets = scan.availableMarkets;

  const visibleDeals = useMemo(() => {
    const minBuyValue = readNumber(minBuy);
    const maxBuyValue = readNumber(maxBuy);
    const minRoiValue = readNumber(minRoi);
    const minLiquidityValue = readNumber(minLiquidity);
    const maxSpreadValue = readNumber(maxSpread);
    const needle = query.trim().toLowerCase();

    return [...scan.opportunities]
      .filter((deal) => {
        const haystack = `${deal.itemName} ${deal.buyMarket} ${deal.sellMarket} ${deal.risk}`.toLowerCase();
        if (needle && !haystack.includes(needle)) return false;
        if (buyMarket && deal.buyMarket !== buyMarket) return false;
        if (sellMarket && deal.sellMarket !== sellMarket) return false;
        if (risk && deal.risk !== risk) return false;
        if (result && deal.result !== result) return false;
        if (minBuyValue !== null && deal.buyPrice < minBuyValue) return false;
        if (maxBuyValue !== null && deal.buyPrice > maxBuyValue) return false;
        if (minRoiValue !== null && deal.roiPercent < minRoiValue) return false;
        if (minLiquidityValue !== null && deal.liquidityScore < minLiquidityValue) return false;
        if (maxSpreadValue !== null && deal.spreadPercent > maxSpreadValue) return false;
        return true;
      })
      .sort((a, b) => compareDeals(a, b, sort));
  }, [buyMarket, maxBuy, maxSpread, minBuy, minLiquidity, minRoi, query, result, risk, scan.opportunities, sellMarket, sort]);

  const counts = useMemo(
    () =>
      scan.opportunities.reduce(
        (acc, deal) => {
          acc[deal.result] += 1;
          if (deal.roiPercent >= 100) acc.roi100 += 1;
          return acc;
        },
        { profit: 0, loss: 0, flat: 0, roi100: 0 }
      ),
    [scan.opportunities]
  );

  const runScan = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/screener/scan"));
      const data = (await response.json()) as ScreenerScanResult | { error?: string };
      if (!response.ok) throw new Error("error" in data ? data.error : "Scan failed");
      setScan(data as ScreenerScanResult);
      setExpanded(null);
    } catch (scanError) {
      setError((scanError as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setQuery("");
    setBuyMarket("");
    setSellMarket("");
    setRisk("");
    setResult("");
    setSort("score");
    setMinBuy("");
    setMaxBuy("");
    setMinRoi("");
    setMinLiquidity("");
    setMaxSpread("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Rust Skin Screener</h1>
          <p className="text-sm text-muted-foreground">Routes, fees, ROI, liquidity, and platform quotes in one workspace.</p>
        </div>
        <Button className="gap-2" onClick={runScan} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          {isLoading ? "Scanning..." : "Scan"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Metric label="Routes" value={scan.counts.opportunities} />
        <Metric label="Shown" value={visibleDeals.length} />
        <Metric label="Prices" value={scan.counts.prices} />
        <Metric label="Profit" value={counts.profit} accent="profit" />
        <Metric label="Loss" value={counts.loss} accent="loss" />
        <Metric label="ROI 100%+" value={counts.roi100} />
      </div>

      {(error || scan.errors.length > 0) && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          {[error, ...scan.errors].filter(Boolean).join(" | ")}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="font-heading text-lg">Market Routes</CardTitle>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Reset
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[1.3fr_repeat(10,minmax(110px,1fr))]">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Search
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Item or market" />
              </div>
            </label>
            <FilterSelect label="Buy" value={buyMarket} onChange={setBuyMarket} options={markets} />
            <FilterSelect label="Sell" value={sellMarket} onChange={setSellMarket} options={markets} />
            <FilterSelect label="Risk" value={risk} onChange={setRisk} options={["lower", "medium", "high", "loss"]} />
            <FilterSelect label="Result" value={result} onChange={setResult} options={["profit", "loss", "flat"]} />
            <FilterSelect
              label="Sort"
              value={sort}
              onChange={(value) => setSort(value as SortMode)}
              options={["score", "roiDesc", "profitDesc", "lossAsc", "spreadDesc"]}
              labels={{ roiDesc: "ROI high", profitDesc: "Profit high", lossAsc: "Loss biggest", spreadDesc: "Spread high" }}
            />
            <NumberFilter label="Min buy" value={minBuy} onChange={setMinBuy} />
            <NumberFilter label="Max buy" value={maxBuy} onChange={setMaxBuy} />
            <NumberFilter label="Min ROI" value={minRoi} onChange={setMinRoi} />
            <NumberFilter label="Min liq." value={minLiquidity} onChange={setMinLiquidity} />
            <NumberFilter label="Max spread" value={maxSpread} onChange={setMaxSpread} />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[1120px] border-collapse text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Route</th>
                  <th className="px-4 py-3 text-right">Buy</th>
                  <th className="px-4 py-3 text-right">Sell</th>
                  <th className="px-4 py-3 text-right">Profit</th>
                  <th className="px-4 py-3 text-right">ROI</th>
                  <th className="px-4 py-3 text-right">Liquidity</th>
                  <th className="px-4 py-3 text-left">Risk</th>
                  <th className="px-4 py-3 text-right">Platforms</th>
                </tr>
              </thead>
              <tbody>
                {visibleDeals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      {scan.scannedAt ? "No matching routes." : "Press Scan to load routes."}
                    </td>
                  </tr>
                ) : (
                  visibleDeals.map((deal) => {
                    const key = dealKey(deal);
                    const isExpanded = expanded === key;
                    return (
                      <Fragment key={key}>
                        <tr className={cn("border-t transition-colors", isExpanded && "bg-muted/30")}>
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium">{deal.itemName}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{deal.signals.join(" | ") || "no extra signal"}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <a className="text-primary hover:underline" href={deal.buyUrl} target="_blank" rel="noreferrer">
                              {deal.buyMarket}
                            </a>
                            <span className="mx-2 text-muted-foreground">-&gt;</span>
                            <a className="text-primary hover:underline" href={deal.sellUrl} target="_blank" rel="noreferrer">
                              {deal.sellMarket}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-right align-top font-mono">${formatMoney(deal.buyPrice)}</td>
                          <td className="px-4 py-3 text-right align-top font-mono">
                            ${formatMoney(deal.sellPrice)}
                            <div className="text-xs text-muted-foreground">
                              fee {formatMoney(deal.sellFeePercent)}% | net ${formatMoney(deal.revenueAfterFee)}
                            </div>
                          </td>
                          <td className={cn("px-4 py-3 text-right align-top font-mono font-semibold", deal.netProfit >= 0 ? "text-profit" : "text-loss")}>
                            {formatSignedMoney(deal.netProfit)}
                          </td>
                          <td className={cn("px-4 py-3 text-right align-top font-mono", deal.roiPercent >= 0 ? "text-profit" : "text-loss")}>
                            {formatSignedPercent(deal.roiPercent)}
                          </td>
                          <td className="px-4 py-3 text-right align-top font-mono">{deal.liquidityScore}/100</td>
                          <td className="px-4 py-3 align-top">
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", riskClass(deal.risk))}>{deal.risk}</span>
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <Button variant="outline" size="sm" onClick={() => setExpanded(isExpanded ? null : key)}>
                              {isExpanded ? "Hide" : "Prices"}
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-t bg-background">
                            <td colSpan={9} className="p-4">
                              <PlatformDetails deal={deal} markets={markets} fees={scan.config.fees} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number | string; accent?: "profit" | "loss" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("mt-2 font-heading text-2xl font-bold", accent === "profit" && "text-profit", accent === "loss" && "text-loss")}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  labels = {},
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] || option}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      <Input value={value} type="number" step="0.01" onChange={(event) => onChange(event.target.value)} placeholder="any" />
    </label>
  );
}

function PlatformDetails({
  deal,
  markets,
  fees,
}: {
  deal: ScreenerOpportunity;
  markets: string[];
  fees: Record<string, number>;
}) {
  const rows = buildDisplayQuotes(deal.platformQuotes, markets, fees);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-4 lg:grid-cols-2">
        <MarketSnapshot title="Buy platform" market={deal.buyMarket} quote={deal.platformQuotes.find((quote) => quote.market === deal.buyMarket)} />
        <MarketSnapshot title="Sell platform" market={deal.sellMarket} quote={deal.platformQuotes.find((quote) => quote.market === deal.sellMarket)} />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Min <strong className="text-foreground">${formatMoney(deal.platformStats.min)}</strong></span>
          <span>Max <strong className="text-foreground">${formatMoney(deal.platformStats.max)}</strong></span>
          <span>Avg net <strong className="text-foreground">${formatMoney(deal.platformStats.avg)}</strong></span>
        </div>
        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {rows.map((quote) =>
            quote.isLive ? (
              <a
                key={quote.market}
                className="grid grid-cols-[88px_1fr] gap-x-3 rounded-md border bg-card/60 px-3 py-2 text-sm hover:border-primary/60"
                href={quote.url}
                target="_blank"
                rel="noreferrer"
              >
                <span className="font-semibold uppercase text-primary">{quote.market}</span>
                <strong className="text-right font-mono text-profit">${formatMoney(quote.netSellPrice)}</strong>
                <small className="col-span-2 text-muted-foreground">
                  raw ${formatMoney(quote.sellPrice)} | buy ${formatMoney(quote.buyPrice)} | fee {formatMoney(quote.feePercent)}%
                </small>
                {renderQuoteMeta(quote)}
              </a>
            ) : (
              <div key={quote.market} className="grid grid-cols-[88px_1fr] gap-x-3 rounded-md border bg-muted/20 px-3 py-2 text-sm opacity-60">
                <span className="font-semibold uppercase text-primary">{quote.market}</span>
                <strong className="text-right font-mono text-muted-foreground">--</strong>
                <small className="col-span-2 text-muted-foreground">fee {formatMoney(quote.feePercent)}% | no live quote for this item</small>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function MarketSnapshot({ title, market, quote }: { title: string; market: string; quote?: ScreenerPlatformQuote }) {
  if (!quote) {
    return (
      <div className="rounded-lg border bg-card/40 p-4">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{title}</span>
          <strong className="uppercase text-primary">{market}</strong>
        </div>
        <div className="grid min-h-[220px] place-items-center rounded-md border border-dashed text-sm text-muted-foreground">No data.</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{title}</span>
        <strong className="uppercase text-primary">{market}</strong>
      </div>
      {quote.priceHistory.length >= 2 ? (
        <HistoryChart quote={quote} />
      ) : (
        <div className="grid min-h-[220px] place-items-center rounded-md border bg-background/70 p-6 text-center">
          <div>
            <div className="font-heading text-2xl font-bold">${formatMoney(quote.netSellPrice)}</div>
            <div className="mt-2 text-sm text-muted-foreground">No real price history available from this source.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryChart({ quote }: { quote: ScreenerPlatformQuote }) {
  const points = quote.priceHistory.slice(-60);
  const values = points.map((point) => point.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.01, max - min);
  const width = 480;
  const height = 220;
  const pad = 24;
  const coords = points.map((point, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(1, points.length - 1);
    const y = height - pad - ((point.price - min) / range) * (height - pad * 2);
    return { ...point, x, y };
  });
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");

  return (
    <svg className="h-[220px] w-full rounded-md border bg-background/70" viewBox={`0 0 ${width} ${height}`} role="img">
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
      {coords
        .filter((point) => Number.isFinite(point.sales || NaN) && Number(point.sales) > 0)
        .map((point) => (
          <g key={`${point.date}-${point.x}`}>
            <circle cx={point.x} cy={point.y} r="3" fill="hsl(var(--chart-orange))" />
            <text x={point.x} y={Math.max(14, point.y - 8)} textAnchor="middle" fill="hsl(var(--chart-orange))" fontSize="10">
              {formatSales(point.sales)}
            </text>
          </g>
        ))}
      <text x={pad} y={18} fill="hsl(var(--muted-foreground))" fontSize="11">
        min ${formatMoney(min)}
      </text>
      <text x={width - pad} y={18} fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="end">
        max ${formatMoney(max)}
      </text>
    </svg>
  );
}

function buildDisplayQuotes(quotes: ScreenerPlatformQuote[], markets: string[], fees: Record<string, number>) {
  const liveByMarket = new Map(quotes.map((quote) => [quote.market, { ...quote, isLive: true as const }]));
  return markets
    .map((market) => liveByMarket.get(market) || { market, feePercent: (fees[market] || 0) * 100, isLive: false as const })
    .sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      const aPrice = "netSellPrice" in a && Number.isFinite(a.netSellPrice) ? a.netSellPrice : -1;
      const bPrice = "netSellPrice" in b && Number.isFinite(b.netSellPrice) ? b.netSellPrice : -1;
      return bPrice - aPrice || a.market.localeCompare(b.market);
    });
}

function renderQuoteMeta(quote: ScreenerPlatformQuote) {
  const lines: string[] = [];
  if (quote.sales24h !== null && quote.sales24h !== undefined) {
    lines.push(`24h sold ${formatSales(quote.sales24h)}${quote.salesSource ? ` (${quote.salesSource})` : ""}`);
  }
  if (quote.orderCount !== null && quote.orderCount !== undefined) lines.push(`orders ${formatSales(quote.orderCount)}`);
  if (quote.listedCount !== null && quote.listedCount !== undefined) lines.push(`listed ${formatSales(quote.listedCount)}`);
  if (!lines.length) return null;
  return <small className="col-span-2 text-muted-foreground">{lines.join(" | ")}</small>;
}

function compareDeals(a: ScreenerOpportunity, b: ScreenerOpportunity, sort: SortMode) {
  switch (sort) {
    case "roiDesc":
      return b.roiPercent - a.roiPercent;
    case "profitDesc":
      return b.netProfit - a.netProfit;
    case "lossAsc":
      return a.netProfit - b.netProfit;
    case "spreadDesc":
      return b.spreadPercent - a.spreadPercent;
    default:
      return 0;
  }
}

function dealKey(deal: ScreenerOpportunity) {
  return `${deal.itemName}|${deal.buyMarket}|${deal.sellMarket}|${deal.buyPrice}|${deal.sellPrice}`;
}

function riskClass(risk: ScreenerOpportunity["risk"]) {
  if (risk === "lower") return "bg-profit text-profit";
  if (risk === "medium") return "bg-yellow-500/15 text-yellow-400";
  return "bg-loss text-loss";
}

function readNumber(value: string) {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: number) {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2).replace(/\.00$/, "");
}

function formatSignedMoney(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${formatMoney(Math.abs(value))}`;
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatMoney(value)}%`;
}

function formatSales(value: number | null | undefined) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(numeric));
}
