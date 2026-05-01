import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateTrade } from "@/hooks/use-trades";
import { GAMES, type GameType, type TradeType, type Trade } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EditTradeDialogProps {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTradeDialog({ trade, open, onOpenChange }: EditTradeDialogProps) {
  const update = useUpdateTrade();

  const [game, setGame] = useState<GameType>("CS2");
  const [itemName, setItemName] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [tradeDate, setTradeDate] = useState("");
  const [notes, setNotes] = useState("");

  const isPending = tradeType === "pending";

  // Заповнюємо форму коли відкривається діалог
  useEffect(() => {
    if (trade && open) {
      setGame(trade.game);
      setItemName(trade.item_name);
      setEntryPrice(trade.entry_price.toString());
      setExitPrice(trade.exit_price.toString());
      setQuantity(trade.quantity.toString());
      setTradeType(trade.trade_type);
      setTradeDate(new Date(trade.trade_date).toISOString().slice(0, 10));
      setNotes(trade.notes || "");
    }
  }, [trade, open]);

  const handleSubmit = () => {
    if (!trade || !itemName || !entryPrice) {
      toast.error("Fill all required fields");
      return;
    }
    if (!isPending && !exitPrice) {
      toast.error("Exit price is required for completed trades");
      return;
    }

    update.mutate(
      {
        id: trade.id,
        game,
        item_name: itemName,
        entry_price: parseFloat(entryPrice),
        exit_price: isPending ? parseFloat(entryPrice) : parseFloat(exitPrice),
        quantity: parseInt(quantity) || 1,
        trade_type: tradeType,
        trade_date: new Date(tradeDate).toISOString(),
        notes: notes || null,
      },
      {
        onSuccess: () => {
          toast.success("Trade updated");
          onOpenChange(false);
        },
        onError: () => {
          toast.error("Failed to update trade");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Trade</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Game</Label>
              <Select value={game} onValueChange={(v) => setGame(v as GameType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GAMES.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={tradeType} onValueChange={(v) => setTradeType(v as TradeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Item Name</Label>
            <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="AK-47 | Redline" />
          </div>
          <div className={cn("gap-3", isPending ? "grid grid-cols-2" : "grid grid-cols-3")}>
            <div>
              <Label>Entry $</Label>
              <Input type="number" step="0.01" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
            </div>
            {!isPending && (
              <div>
                <Label>Exit $</Label>
                <Input type="number" step="0.01" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} />
              </div>
            )}
            <div>
              <Label>Qty</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>
          <Button onClick={handleSubmit} disabled={update.isPending}>
            {update.isPending ? "Updating..." : "Update Trade"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
