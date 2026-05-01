CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL CHECK (game IN ('CS2', 'Dota2', 'Rust')),
  item_name TEXT NOT NULL,
  entry_price NUMERIC(12, 2) NOT NULL,
  exit_price NUMERIC(12, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  trade_type TEXT NOT NULL DEFAULT 'buy' CHECK (trade_type IN ('buy', 'sell', 'pending')),
  trade_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL CHECK (game IN ('CS2', 'Dota2', 'Rust')),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  avg_buy_price NUMERIC(12, 2) NOT NULL,
  current_price NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_circle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES trade_circles(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL UNIQUE REFERENCES trades(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trades_game ON trades(game);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(trade_date);
CREATE INDEX IF NOT EXISTS idx_portfolio_game ON portfolio(game);
CREATE INDEX IF NOT EXISTS idx_trade_circle_items_circle_id ON trade_circle_items(circle_id);
CREATE INDEX IF NOT EXISTS idx_trade_circle_items_trade_id ON trade_circle_items(trade_id);
