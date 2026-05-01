import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

const { Pool } = pg;

export type QueryParam = string | number | boolean | null | Date;

let pool: pg.Pool | undefined;
let schemaPromise: Promise<void> | undefined;

export class DatabaseConfigError extends Error {
  constructor() {
    super("DATABASE_URL or POSTGRES_URL is required for Vercel Functions.");
  }
}

export function hasDatabaseUrl() {
  return Boolean(getDatabaseUrl(false));
}

export function getPool() {
  if (pool) return pool;

  const connectionString = getDatabaseUrl(true);
  pool = new Pool({
    connectionString,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });

  attachDatabasePool(pool);
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: QueryParam[] = []) {
  await ensureSchema();
  return getPool().query<T>(text, params);
}

export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>) {
  await ensureSchema();
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureSchema() {
  schemaPromise ??= getPool().query(schemaSql).then(() => undefined);
  return schemaPromise;
}

function getDatabaseUrl(required: true): string;
function getDatabaseUrl(required: false): string | undefined;
function getDatabaseUrl(required: boolean) {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (!url && required) throw new DatabaseConfigError();
  return url;
}

function shouldUseSsl(connectionString: string) {
  if (process.env.POSTGRES_SSL === "false") return false;
  if (/localhost|127\.0\.0\.1/i.test(connectionString)) return false;
  return true;
}

const schemaSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trade_type') THEN
    ALTER TYPE public.trade_type ADD VALUE IF NOT EXISTS 'pending';
  END IF;
END $$;

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
`;
