import { useEffect, useMemo, useState } from "react";
import { AddTradeDialog } from "@/components/AddTradeDialog";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { GameSwitcher } from "@/components/GameSwitcher";
import { MetricCard } from "@/components/MetricCard";
import { TradesTable } from "@/components/TradesTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreateCircle, useCircles, useUpdateCircle } from "@/hooks/use-circles";
import { useTrades } from "@/hooks/use-trades";
import { cn } from "@/lib/utils";
import type { GameType, Trade } from "@/lib/types";
import { BarChart3, Hash, Plus, Table2, Target, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AnalyticsPageProps {
  section?: "total" | "tables";
}

function calculateTradeMetrics(trades: Trade[]) {
  const completed = trades.filter((trade) => trade.trade_type !== "pending");
  const pending = trades.filter((trade) => trade.trade_type === "pending");
  const pendingValue = pending.reduce((sum, trade) => sum + trade.entry_price * trade.quantity, 0);

  if (completed.length === 0) {
    return {
      totalPnl: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      count: 0,
      pendingCount: pending.length,
      pendingValue,
      avgPnlPct: 0,
      balance: pendingValue,
    };
  }

  const pnls = completed.map((trade) => (trade.exit_price - trade.entry_price) * trade.quantity);
  const pnlPcts = completed.map((trade) => ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100);
  const wins = pnls.filter((value) => value > 0);
  const losses = pnls.filter((value) => value < 0);
  const totalPnl = pnls.reduce((sum, value) => sum + value, 0);

  return {
    totalPnl,
    avgPnlPct: pnlPcts.reduce((sum, value) => sum + value, 0) / pnlPcts.length,
    winRate: (wins.length / pnls.length) * 100,
    avgWin: wins.length ? wins.reduce((sum, value) => sum + value, 0) / wins.length : 0,
    avgLoss: losses.length ? losses.reduce((sum, value) => sum + value, 0) / losses.length : 0,
    count: completed.length,
    pendingCount: pending.length,
    pendingValue,
    balance: pendingValue + totalPnl,
  };
}

export default function AnalyticsPage({ section = "total" }: AnalyticsPageProps) {
  const { data: trades = [], isLoading } = useTrades();
  const { data: circles = [], isLoading: circlesLoading } = useCircles();
  const createCircle = useCreateCircle();
  const updateCircle = useUpdateCircle();

  const [selectedGame, setSelectedGame] = useState<GameType | "All">("All");
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState("");

  const filtered = useMemo(() => {
    if (selectedGame === "All") return trades;
    return trades.filter((trade) => trade.game === selectedGame);
  }, [trades, selectedGame]);

  const metrics = useMemo(() => calculateTradeMetrics(filtered), [filtered]);

  const filteredCircles = useMemo(
    () =>
      circles.map((circle) => ({
        ...circle,
        trades: selectedGame === "All" ? circle.trades : circle.trades.filter((trade) => trade.game === selectedGame),
      })),
    [circles, selectedGame]
  );

  useEffect(() => {
    if (!filteredCircles.length) {
      setSelectedCircleId(null);
      return;
    }
    if (!selectedCircleId || !filteredCircles.some((circle) => circle.id === selectedCircleId)) {
      setSelectedCircleId(filteredCircles[0].id);
    }
  }, [filteredCircles, selectedCircleId]);

  const activeCircle = useMemo(
    () => filteredCircles.find((circle) => circle.id === selectedCircleId) ?? null,
    [filteredCircles, selectedCircleId]
  );

  const activeTradeIds = useMemo(
    () => new Set(activeCircle?.trades.map((trade) => trade.id) ?? []),
    [activeCircle]
  );

  const tradeCircleMap = useMemo(() => {
    const mapping = new Map<string, { id: string; name: string }>();
    for (const circle of circles) {
      for (const trade of circle.trades) {
        mapping.set(trade.id, { id: circle.id, name: circle.name });
      }
    }
    return mapping;
  }, [circles]);

  const activeCircleMetrics = useMemo(
    () => calculateTradeMetrics(activeCircle?.trades ?? []),
    [activeCircle]
  );

  const handleCreateTable = () => {
    if (!newTableName.trim()) {
      toast.error("Table name is required");
      return;
    }

    createCircle.mutate(
      { name: newTableName.trim(), tradeIds: [] },
      {
        onSuccess: (circle) => {
          toast.success("Analytics table created");
          setNewTableName("");
          setSelectedCircleId(circle.id);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const handleToggleTrade = (tradeId: string) => {
    if (!activeCircle) {
      toast.error("Create or select a table first");
      return;
    }

    const fullActiveCircle = circles.find((circle) => circle.id === activeCircle.id);
    if (!fullActiveCircle) return;

    const nextTradeIds = activeTradeIds.has(tradeId)
      ? fullActiveCircle.trades.filter((trade) => trade.id !== tradeId).map((trade) => trade.id)
      : [...fullActiveCircle.trades.map((trade) => trade.id), tradeId];

    updateCircle.mutate(
      { id: activeCircle.id, tradeIds: nextTradeIds },
      {
        onError: (error) => toast.error(error.message),
      }
    );
  };

  if (isLoading || circlesLoading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Track your trading performance across games</p>
        </div>
        <div className="flex items-center gap-3">
          <GameSwitcher selected={selectedGame} onSelect={setSelectedGame} />
          <AddTradeDialog />
        </div>
      </div>

      {section === "total" && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard
              label="Total PnL"
              value={`$${metrics.totalPnl.toFixed(2)}`}
              trend={metrics.totalPnl > 0 ? "up" : metrics.totalPnl < 0 ? "down" : "neutral"}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricCard
              label="Win Rate"
              value={`${metrics.winRate.toFixed(1)}%`}
              trend={metrics.winRate >= 50 ? "up" : "down"}
              icon={<Target className="h-4 w-4" />}
            />
            <MetricCard
              label="Avg Win"
              value={`$${metrics.avgWin.toFixed(2)}`}
              trend="up"
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <MetricCard
              label="Avg Loss"
              value={`$${Math.abs(metrics.avgLoss).toFixed(2)}`}
              trend="down"
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <MetricCard label="Trades" value={metrics.count} trend="neutral" icon={<Hash className="h-4 w-4" />} />
          </div>

          <AnalyticsCharts trades={filtered} allTrades={trades} />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-heading font-semibold">Trade History</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Balance:</span>
                  <span className="text-lg font-bold font-mono text-foreground">${metrics.balance.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Avg PnL:</span>
                  <span
                    className={`text-lg font-bold font-mono ${
                      metrics.avgPnlPct > 0 ? "text-profit" : metrics.avgPnlPct < 0 ? "text-loss" : "text-muted-foreground"
                    }`}
                  >
                    {metrics.avgPnlPct > 0 ? "+" : ""}
                    {metrics.avgPnlPct.toFixed(2)}%
                  </span>
                </div>
                {metrics.pendingCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Pending:</span>
                    <span className="text-sm font-semibold text-yellow-500">
                      {metrics.pendingCount} (${metrics.pendingValue.toFixed(2)})
                    </span>
                  </div>
                )}
              </div>
            </div>
            <TradesTable trades={filtered} />
          </div>
        </>
      )}

      {section === "tables" && (
        <div className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-heading font-semibold">Custom Analytics Tables</h2>
              <p className="text-sm text-muted-foreground">
                Create separate tables and calculate profit only inside each one, while keeping full analytics above.
              </p>
            </div>
            <div className="flex w-full max-w-md items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="analytics-table-name">Table Name</Label>
                <Input
                  id="analytics-table-name"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Weekend flips"
                />
              </div>
              <Button className="gap-2" onClick={handleCreateTable} disabled={createCircle.isPending}>
                <Plus className="h-4 w-4" />
                {createCircle.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">Your Tables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredCircles.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                    No custom tables yet.
                  </div>
                ) : (
                  filteredCircles.map((circle) => {
                    const circleMetrics = calculateTradeMetrics(circle.trades);

                    return (
                      <button
                        key={circle.id}
                        type="button"
                        className={cn(
                          "w-full rounded-lg border p-3 text-left transition-colors",
                          selectedCircleId === circle.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40 hover:bg-muted/40"
                        )}
                        onClick={() => setSelectedCircleId(circle.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{circle.name}</div>
                            <div className="text-xs text-muted-foreground">{circle.trades.length} trades</div>
                          </div>
                          <div
                            className={cn(
                              "text-sm font-mono font-semibold",
                              circleMetrics.totalPnl > 0
                                ? "text-profit"
                                : circleMetrics.totalPnl < 0
                                  ? "text-loss"
                                  : "text-muted-foreground"
                            )}
                          >
                            {circleMetrics.totalPnl > 0 ? "+" : ""}${circleMetrics.totalPnl.toFixed(2)}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard label="Table Trades" value={activeCircleMetrics.count} trend="neutral" icon={<Table2 className="h-4 w-4" />} />
                <MetricCard
                  label="Table PnL"
                  value={`$${activeCircleMetrics.totalPnl.toFixed(2)}`}
                  trend={
                    activeCircleMetrics.totalPnl > 0 ? "up" : activeCircleMetrics.totalPnl < 0 ? "down" : "neutral"
                  }
                />
                <MetricCard label="Table Win Rate" value={`${activeCircleMetrics.winRate.toFixed(1)}%`} trend="neutral" />
                <MetricCard label="Pending Value" value={`$${activeCircleMetrics.pendingValue.toFixed(2)}`} trend="neutral" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-lg">
                    {activeCircle ? activeCircle.name : "Select a custom table"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!activeCircle ? (
                    <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
                      Create or select a table to see its isolated analytics.
                    </div>
                  ) : activeCircle.trades.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
                      This table is empty. Add trades from the list below.
                    </div>
                  ) : (
                    <TradesTable trades={activeCircle.trades} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Add Trades To Selected Table</CardTitle>
                </CardHeader>
                <CardContent>
                  {filtered.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
                      No trades found for this filter.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Date</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">PnL</TableHead>
                            <TableHead>Current Table</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((trade) => {
                            const isPending = trade.trade_type === "pending";
                            const pnl = isPending ? 0 : (trade.exit_price - trade.entry_price) * trade.quantity;
                            const linkedCircle = tradeCircleMap.get(trade.id);
                            const inActiveCircle = activeTradeIds.has(trade.id);
                            const lockedByOtherCircle = linkedCircle && linkedCircle.id !== activeCircle?.id;

                            return (
                              <TableRow key={trade.id}>
                                <TableCell className="text-xs text-muted-foreground">
                                  {format(new Date(trade.trade_date), "MMM dd, yyyy")}
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{trade.item_name}</div>
                                  <div className="text-xs text-muted-foreground">{trade.game}</div>
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "text-right font-mono text-sm",
                                    isPending ? "text-yellow-500" : pnl >= 0 ? "text-profit" : "text-loss"
                                  )}
                                >
                                  {isPending ? "—" : `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
                                </TableCell>
                                <TableCell>
                                  {linkedCircle ? (
                                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                                      {linkedCircle.name}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Unassigned</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant={inActiveCircle ? "secondary" : "outline"}
                                    size="sm"
                                    disabled={!activeCircle || !!lockedByOtherCircle || updateCircle.isPending}
                                    onClick={() => handleToggleTrade(trade.id)}
                                  >
                                    {inActiveCircle ? "Remove" : lockedByOtherCircle ? "Locked" : "Add"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
