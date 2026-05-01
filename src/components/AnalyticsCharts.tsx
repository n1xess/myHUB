import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import type { Trade, GameType } from "@/lib/types";
import { GAME_COLORS, GAMES } from "@/lib/types";
import { format } from "date-fns";

interface AnalyticsChartsProps {
  trades: Trade[];
  allTrades: Trade[];
}

export function AnalyticsCharts({ trades, allTrades }: AnalyticsChartsProps) {
  const equityData = useMemo(() => {
    if (trades.length === 0) return [];
    const sorted = [...trades].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
    let cumPnl = 0;
    return sorted.map((t) => {
      cumPnl += (t.exit_price - t.entry_price) * t.quantity;
      return { date: format(new Date(t.trade_date), "MMM dd"), pnl: cumPnl };
    });
  }, [trades]);

  const gameBreakdown = useMemo(() => {
    return GAMES.map((game) => {
      const gameTrades = allTrades.filter((t) => t.game === game);
      const pnl = gameTrades.reduce((s, t) => s + (t.exit_price - t.entry_price) * t.quantity, 0);
      return { name: game, value: Math.abs(pnl) || 0.01, pnl, count: gameTrades.length };
    }).filter((g) => g.count > 0);
  }, [allTrades]);

  const pnlDistribution = useMemo(() => {
    return trades.map((t) => ({
      item: t.item_name.slice(0, 15),
      pnl: (t.exit_price - t.entry_price) * t.quantity,
    }));
  }, [trades]);

  const tooltipStyle = {
    contentStyle: { backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "8px" },
    labelStyle: { color: "hsl(210, 20%, 70%)" },
  };

  if (trades.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Equity Curve */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">Equity Curve</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={equityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="pnl" stroke="hsl(72, 100%, 50%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Game Breakdown */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">By Game</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={gameBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
              {gameBreakdown.map((entry) => (
                <Cell key={entry.name} fill={GAME_COLORS[entry.name as GameType]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* PnL Distribution */}
      <div className="rounded-lg border bg-card p-4 lg:col-span-2">
        <h3 className="mb-3 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">PnL Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={pnlDistribution.slice(0, 20)}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
            <XAxis dataKey="item" tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {pnlDistribution.slice(0, 20).map((entry, index) => (
                <Cell key={index} fill={entry.pnl >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
