import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePortfolioItem } from "@/hooks/use-portfolio";
import { GAMES, type GameType } from "@/lib/types";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function AddPortfolioDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreatePortfolioItem();

  const [game, setGame] = useState<GameType>("CS2");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [avgBuyPrice, setAvgBuyPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  const handleSubmit = () => {
    if (!itemName || !avgBuyPrice) {
      toast.error("Fill all required fields");
      return;
    }
    create.mutate(
      {
        game,
        item_name: itemName,
        quantity: parseInt(quantity) || 1,
        avg_buy_price: parseFloat(avgBuyPrice),
        current_price: currentPrice ? parseFloat(currentPrice) : null,
      },
      {
        onSuccess: () => {
          toast.success("Item added to portfolio");
          setOpen(false);
          setItemName("");
          setQuantity("1");
          setAvgBuyPrice("");
          setCurrentPrice("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Add Portfolio Item</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
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
            <Label>Item Name</Label>
            <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="AWP | Dragon Lore" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Qty</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <Label>Avg Buy $</Label>
              <Input type="number" step="0.01" value={avgBuyPrice} onChange={(e) => setAvgBuyPrice(e.target.value)} />
            </div>
            <div>
              <Label>Current $</Label>
              <Input type="number" step="0.01" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Adding..." : "Add Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
