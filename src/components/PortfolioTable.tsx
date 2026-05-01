import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useDeletePortfolioItem } from "@/hooks/use-portfolio";
import type { PortfolioItem } from "@/lib/types";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioTableProps {
  items: PortfolioItem[];
}

export function PortfolioTable({ items }: PortfolioTableProps) {
  const deleteItem = useDeletePortfolioItem();

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
        No items in portfolio. Add your first item!
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Game</TableHead>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Avg Buy</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">Unrealized PnL</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const currentVal = (item.current_price ?? item.avg_buy_price) * item.quantity;
            const costBasis = item.avg_buy_price * item.quantity;
            const unrealizedPnl = currentVal - costBasis;
            const isProfit = unrealizedPnl >= 0;
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium">{item.game}</span>
                </TableCell>
                <TableCell className="font-medium">{item.item_name}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right font-mono text-sm">${item.avg_buy_price.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {item.current_price != null ? `$${item.current_price.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">${currentVal.toFixed(2)}</TableCell>
                <TableCell className={cn("text-right font-mono font-medium", isProfit ? "text-profit" : "text-loss")}>
                  {isProfit ? "+" : ""}${unrealizedPnl.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteItem.mutate(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
