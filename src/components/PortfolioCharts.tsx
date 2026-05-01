import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { PortfolioItem, GameType } from "@/lib/types";
import { GAME_COLORS, GAMES } from "@/lib/types";

interface PortfolioChartsProps {
  items: PortfolioItem[];
  allItems: PortfolioItem[];
}

export function PortfolioCharts({ items, allItems }: PortfolioChartsProps) {
  const gameAllocation = useMemo(() => {
    return GAMES.map((game) => {
      const gameItems = allItems.filter((i) => i.game === game);
      const value = gameItems.reduce((s, i) => s + (i.current_price ?? i.avg_buy_price) * i.quantity, 0);
      return { name: game, value: value || 0.01, count: gameItems.length };
    }).filter((g) => g.count > 0);
  }, [allItems]);

  const itemAllocation = useMemo(() => {
    return items
      .map((i) => ({
        name: i.item_name.slice(0, 20),
        value: (i.current_price ?? i.avg_buy_price) * i.quantity,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [items]);

  const tooltipStyle = {
    contentStyle: { backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "8px" },
    labelStyle: { color: "hsl(210, 20%, 70%)" },
  };

  if (items.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">Allocation by Game</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={gameAllocation} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
              {gameAllocation.map((entry) => (
                <Cell key={entry.name} fill={GAME_COLORS[entry.name as GameType]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">Top Items by Value</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={itemAllocation} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} width={120} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="value" fill="hsl(72, 100%, 50%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
