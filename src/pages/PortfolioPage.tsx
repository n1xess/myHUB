import { useMemo, useState } from "react";
import { usePortfolio } from "@/hooks/use-portfolio";
import { GameSwitcher } from "@/components/GameSwitcher";
import { MetricCard } from "@/components/MetricCard";
import { AddPortfolioDialog } from "@/components/AddPortfolioDialog";
import { PortfolioTable } from "@/components/PortfolioTable";
import { PortfolioCharts } from "@/components/PortfolioCharts";
import type { GameType } from "@/lib/types";
import { Wallet, TrendingUp, PieChart } from "lucide-react";

export default function PortfolioPage() {
  const { data: items = [], isLoading } = usePortfolio();
  const [selectedGame, setSelectedGame] = useState<GameType | "All">("All");

  const filtered = useMemo(() => {
    if (selectedGame === "All") return items;
    return items.filter((i) => i.game === selectedGame);
  }, [items, selectedGame]);

  const metrics = useMemo(() => {
    const totalValue = filtered.reduce((s, i) => s + (i.current_price ?? i.avg_buy_price) * i.quantity, 0);
    const totalCost = filtered.reduce((s, i) => s + i.avg_buy_price * i.quantity, 0);
    const unrealizedPnl = totalValue - totalCost;
    return { totalValue, totalCost, unrealizedPnl, itemCount: filtered.length };
  }, [filtered]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">Track your inventory across games</p>
        </div>
        <div className="flex items-center gap-3">
          <GameSwitcher selected={selectedGame} onSelect={setSelectedGame} />
          <AddPortfolioDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total Value"
          value={`$${metrics.totalValue.toFixed(2)}`}
          trend="neutral"
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricCard
          label="Total Cost"
          value={`$${metrics.totalCost.toFixed(2)}`}
          trend="neutral"
          icon={<PieChart className="h-4 w-4" />}
        />
        <MetricCard
          label="Unrealized PnL"
          value={`$${metrics.unrealizedPnl.toFixed(2)}`}
          trend={metrics.unrealizedPnl > 0 ? "up" : metrics.unrealizedPnl < 0 ? "down" : "neutral"}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          label="Items"
          value={metrics.itemCount}
          trend="neutral"
        />
      </div>

      <PortfolioCharts items={filtered} allItems={items} />

      <div>
        <h2 className="mb-3 text-lg font-heading font-semibold">Holdings</h2>
        <PortfolioTable items={filtered} />
      </div>
    </div>
  );
}
