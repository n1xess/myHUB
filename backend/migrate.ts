import db from './db.js';

console.log('Running migrations...');

// Create enum-like tables for type safety
db.exec(`
  -- Create trades table
  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    game TEXT NOT NULL CHECK(game IN ('CS2', 'Dota2', 'Rust')),
    item_name TEXT NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    trade_type TEXT NOT NULL DEFAULT 'buy' CHECK(trade_type IN ('buy', 'sell', 'pending')),
    trade_date TEXT NOT NULL DEFAULT (datetime('now')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Create portfolio table
  CREATE TABLE IF NOT EXISTS portfolio (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    game TEXT NOT NULL CHECK(game IN ('CS2', 'Dota2', 'Rust')),
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    avg_buy_price REAL NOT NULL,
    current_price REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Create trade circles table
  CREATE TABLE IF NOT EXISTS trade_circles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Create trade circle items table
  CREATE TABLE IF NOT EXISTS trade_circle_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    circle_id TEXT NOT NULL,
    trade_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (circle_id) REFERENCES trade_circles(id) ON DELETE CASCADE,
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_trades_game ON trades(game);
  CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(trade_date);
  CREATE INDEX IF NOT EXISTS idx_portfolio_game ON portfolio(game);
  CREATE INDEX IF NOT EXISTS idx_trade_circle_items_circle_id ON trade_circle_items(circle_id);
  CREATE INDEX IF NOT EXISTS idx_trade_circle_items_trade_id ON trade_circle_items(trade_id);

  -- Create update triggers
  CREATE TRIGGER IF NOT EXISTS update_trades_updated_at 
    AFTER UPDATE ON trades
    FOR EACH ROW
    BEGIN
      UPDATE trades SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

  CREATE TRIGGER IF NOT EXISTS update_portfolio_updated_at 
    AFTER UPDATE ON portfolio
    FOR EACH ROW
    BEGIN
      UPDATE portfolio SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

  CREATE TRIGGER IF NOT EXISTS update_trade_circles_updated_at
    AFTER UPDATE ON trade_circles
    FOR EACH ROW
    BEGIN
      UPDATE trade_circles SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
`);

console.log('Migrations completed successfully!');
