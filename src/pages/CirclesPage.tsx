import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTrades } from "@/hooks/use-trades";
import { useCircles, useCreateCircle, useDeleteCircle, useUpdateCircle } from "@/hooks/use-circles";
import { GameSwitcher } from "@/components/GameSwitcher";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TRADE_TYPE_COLORS, type GameType } from "@/lib/types";

export default function CirclesPage() {
  const { data: trades = [], isLoading: tradesLoading } = useTrades();
  const { data: circles = [], isLoading: circlesLoading } = useCircles();
  const createCircle = useCreateCircle();
  const updateCircle = useUpdateCircle();
  const deleteCircle = useDeleteCircle();

  const [selectedGame, setSelectedGame] = useState<GameType | "All">("All");
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!circles.length) {
      setSelectedCircleId(null);
      return;
    }
    if (!selectedCircleId || !circles.some((circle) => circle.id === selectedCircleId)) {
      setSelectedCircleId(circles[0].id);
    }
  }, [circles, selectedCircleId]);

  const filteredTrades = useMemo(() => {
    if (selectedGame === "All") return trades;
    return trades.filter((trade) => trade.game === selectedGame);
  }, [trades, selectedGame]);

  const activeCircle = useMemo(
    () => circles.find((circle) => circle.id === selectedCircleId) ?? null,
    [circles, selectedCircleId]
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

  const activeTradeIds = useMemo(
    () => new Set(activeCircle?.trades.map((trade) => trade.id) ?? []),
    [activeCircle]
  );

  const metrics = useMemo(() => {
    const totalTrades = activeCircle?.trades.length ?? 0;
    const completedTrades = activeCircle?.trades.filter((trade) => trade.trade_type !== "pending") ?? [];
    const pendingValue =
      activeCircle?.trades
        .filter((trade) => trade.trade_type === "pending")
        .reduce((sum, trade) => sum + trade.entry_price * trade.quantity, 0) ?? 0;
    const netPnl = completedTrades.reduce(
      (sum, trade) => sum + (trade.exit_price - trade.entry_price) * trade.quantity,
      0
    );

    return { totalTrades, completedTrades: completedTrades.length, pendingValue, netPnl };
  }, [activeCircle]);

  const handleCreateCircle = () => {
    if (!name.trim()) {
      toast.error("Circle name is required");
      return;
    }

    createCircle.mutate(
      { name: name.trim(), notes: notes.trim() || null, tradeIds: [] },
      {
        onSuccess: (circle) => {
          toast.success("Circle created");
          setSelectedCircleId(circle.id);
          setName("");
          setNotes("");
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const handleDeleteCircle = () => {
    if (!activeCircle) return;

    deleteCircle.mutate(activeCircle.id, {
      onSuccess: () => {
        toast.success("Circle deleted");
        setSelectedCircleId(null);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  const handleToggleTrade = (tradeId: string) => {
    if (!activeCircle) {
      toast.error("Create or select a circle first");
      return;
    }

    const nextTradeIds = activeTradeIds.has(tradeId)
      ? activeCircle.trades.filter((trade) => trade.id !== tradeId).map((trade) => trade.id)
      : [...activeCircle.trades.map((trade) => trade.id), tradeId];

    updateCircle.mutate(
      { id: activeCircle.id, tradeIds: nextTradeIds },
      {
        onError: (error) => toast.error(error.message),
      }
    );
  };

  if (tradesLoading || circlesLoading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Circles</h1>
          <p className="text-sm text-muted-foreground">
            Group existing trades into custom circles and track their clean PnL separately
          </p>
        </div>
        <GameSwitcher selected={selectedGame} onSelect={setSelectedGame} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">New Circle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekend flip batch" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
              </div>
              <Button className="w-full gap-2" onClick={handleCreateCircle} disabled={createCircle.isPending}>
                <Plus className="h-4 w-4" />
                {createCircle.isPending ? "Creating..." : "Create Circle"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Your Circles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {circles.length === 0 ? (
                <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  No circles yet. Create your first one.
                </div>
              ) : (
                circles.map((circle) => {
                  const circlePnl = circle.trades
                    .filter((trade) => trade.trade_type !== "pending")
                    .reduce((sum, trade) => sum + (trade.exit_price - trade.entry_price) * trade.quantity, 0);

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
                          <div className="text-xs text-muted-foreground">
                            {circle.trades.length} trades
                          </div>
                        </div>
                        <div
                          className={cn(
                            "text-sm font-mono font-semibold",
                            circlePnl > 0 ? "text-profit" : circlePnl < 0 ? "text-loss" : "text-muted-foreground"
                          )}
                        >
                          {circlePnl > 0 ? "+" : ""}${circlePnl.toFixed(2)}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Circle Trades" value={metrics.totalTrades} trend="neutral" icon={<Link2 className="h-4 w-4" />} />
            <MetricCard
              label="Completed"
              value={metrics.completedTrades}
              trend="neutral"
            />
            <MetricCard
              label="Net PnL"
              value={`$${metrics.netPnl.toFixed(2)}`}
              trend={metrics.netPnl > 0 ? "up" : metrics.netPnl < 0 ? "down" : "neutral"}
            />
            <MetricCard
              label="Pending Value"
              value={`$${metrics.pendingValue.toFixed(2)}`}
              trend="neutral"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="font-heading text-lg">
                  {activeCircle ? activeCircle.name : "Select a circle"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeCircle?.notes || "Pick a circle to manage which trades belong to it."}
                </p>
              </div>
              {activeCircle && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={handleDeleteCircle}
                  disabled={deleteCircle.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">All Trades</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTrades.length === 0 ? (
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
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">PnL</TableHead>
                        <TableHead>Circle</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTrades.map((trade) => {
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
                            <TableCell>
                              <span
                                className="text-xs font-semibold uppercase"
                                style={{ color: TRADE_TYPE_COLORS[trade.trade_type] }}
                              >
                                {trade.trade_type}
                              </span>
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
  );
}
