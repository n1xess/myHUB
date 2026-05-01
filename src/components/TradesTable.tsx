import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useDeleteTrade } from "@/hooks/use-trades";
import { EditTradeDialog } from "@/components/EditTradeDialog";
import type { Trade } from "@/lib/types";
import { Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TRADE_TYPE_COLORS } from "@/lib/types";

interface TradesTableProps {
  trades: Trade[];
}

export function TradesTable({ trades }: TradesTableProps) {
  const deleteTrade = useDeleteTrade();
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
        No trades yet. Add your first trade!
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Game</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Entry</TableHead>
              <TableHead className="text-right">Exit</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">PnL</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => {
              const isPending = trade.trade_type === "pending";
              const pnl = isPending ? 0 : (trade.exit_price - trade.entry_price) * trade.quantity;
              const pctReturn = isPending ? 0 : ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100;
              const isProfit = pnl >= 0;
              return (
                <TableRow key={trade.id} className={cn(isPending && "bg-yellow-500/10 hover:bg-yellow-500/15")}>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(trade.trade_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium">{trade.game}</span>
                  </TableCell>
                  <TableCell className="font-medium">{trade.item_name}</TableCell>
                  <TableCell>
                    <span
                      className="text-xs uppercase font-semibold"
                      style={{ color: TRADE_TYPE_COLORS[trade.trade_type as keyof typeof TRADE_TYPE_COLORS] }}
                    >
                      {trade.trade_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">${trade.entry_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {isPending ? (
                      <span className="text-yellow-500 font-semibold">Awaiting...</span>
                    ) : (
                      `$${trade.exit_price.toFixed(2)}`
                    )}
                  </TableCell>
                  <TableCell className="text-right">{trade.quantity}</TableCell>
                  <TableCell className={cn("text-right font-mono font-medium", isPending ? "text-yellow-500" : isProfit ? "text-profit" : "text-loss")}>
                    {isPending ? "—" : `${isProfit ? "+" : ""}$${pnl.toFixed(2)}`}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-sm", isPending ? "text-yellow-500" : isProfit ? "text-profit" : "text-loss")}>
                    {isPending ? "—" : `${isProfit ? "+" : ""}${pctReturn.toFixed(1)}%`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => setEditingTrade(trade)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteTrade.mutate(trade.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <EditTradeDialog
        trade={editingTrade}
        open={!!editingTrade}
        onOpenChange={(open) => !open && setEditingTrade(null)}
      />
    </>
  );
}
