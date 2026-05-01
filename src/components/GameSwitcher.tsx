import { cn } from "@/lib/utils";
import type { GameType } from "@/lib/types";
import { GAMES } from "@/lib/types";

interface GameSwitcherProps {
  selected: GameType | "All";
  onSelect: (game: GameType | "All") => void;
}

const gameIcons: Record<string, string> = {
  All: "🎮",
  CS2: "🔫",
  Dota2: "⚔️",
  Rust: "🔨",
};

export function GameSwitcher({ selected, onSelect }: GameSwitcherProps) {
  const options: (GameType | "All")[] = ["All", ...GAMES];

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {options.map((game) => (
        <button
          key={game}
          onClick={() => onSelect(game)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            selected === game
              ? "bg-primary text-primary-foreground glow-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>{gameIcons[game]}</span>
          {game}
        </button>
      ))}
    </div>
  );
}
