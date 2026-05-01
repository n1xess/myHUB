import type { PoolClient, QueryResultRow } from "pg";
import type { QueryParam } from "./_db";
import { DatabaseConfigError, hasDatabaseUrl, query, withTransaction } from "./_db";
import type { ApiRequest, ApiResponse } from "./_http";
import { applyCors, getPathSegments, json, methodNotAllowed, notFound, readBody, toIso } from "./_http";
import { getScannerConfig, runScan } from "./_scanner";

const tradeColumns = `
  id::text,
  game,
  item_name,
  entry_price::float8 AS entry_price,
  exit_price::float8 AS exit_price,
  quantity,
  trade_type,
  trade_date,
  notes,
  created_at,
  updated_at
`;

const portfolioColumns = `
  id::text,
  game,
  item_name,
  quantity,
  avg_buy_price::float8 AS avg_buy_price,
  current_price::float8 AS current_price,
  created_at,
  updated_at
`;

const circleSelect = `
  SELECT
    c.id::text,
    c.name,
    c.notes,
    c.created_at,
    c.updated_at,
    COALESCE(
      json_agg(
        json_build_object(
          'id', t.id::text,
          'game', t.game,
          'item_name', t.item_name,
          'entry_price', t.entry_price::float8,
          'exit_price', t.exit_price::float8,
          'quantity', t.quantity,
          'trade_type', t.trade_type,
          'trade_date', t.trade_date,
          'notes', t.notes,
          'created_at', t.created_at,
          'updated_at', t.updated_at
        )
        ORDER BY t.trade_date DESC
      ) FILTER (WHERE t.id IS NOT NULL),
      '[]'::json
    ) AS trades
  FROM trade_circles c
  LEFT JOIN trade_circle_items ci ON ci.circle_id = c.id
  LEFT JOIN trades t ON t.id = ci.trade_id
`;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (applyCors(req, res)) return;

  try {
    const [resource, id, subResource] = getPathSegments(req);

    if (!resource || resource === "health") {
      return json(res, 200, {
        status: "ok",
        database: hasDatabaseUrl() ? "configured" : "missing",
        timestamp: new Date().toISOString(),
      });
    }

    if (resource === "trades") return handleTrades(req, res, id);
    if (resource === "portfolio") return handlePortfolio(req, res, id);
    if (resource === "circles") return handleCircles(req, res, id);
    if (resource === "screener") return handleScreener(req, res, id, subResource);

    return notFound(res);
  } catch (error) {
    if (error instanceof DatabaseConfigError) {
      return json(res, 500, {
        error: error.message,
        hint: "Connect a Postgres integration in Vercel Marketplace or set DATABASE_URL/POSTGRES_URL.",
      });
    }

    console.error(error);
    return json(res, 500, { error: "Internal server error" });
  }
}

async function handleTrades(req: ApiRequest, res: ApiResponse, id?: string) {
  if (!id && req.method === "GET") {
    const result = await query(`SELECT ${tradeColumns} FROM trades ORDER BY trade_date DESC`);
    return json(res, 200, result.rows.map(normalizeTrade));
  }

  if (!id && req.method === "POST") {
    const body = readBody<TradeBody>(req);
    const result = await query(
      `
        INSERT INTO trades (game, item_name, entry_price, exit_price, quantity, trade_type, trade_date, notes)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, now()), $8)
        RETURNING ${tradeColumns}
      `,
      [
        String(body.game || ""),
        String(body.item_name || ""),
        Number(body.entry_price),
        Number(body.exit_price),
        Number(body.quantity || 1),
        body.trade_type || "buy",
        body.trade_date || null,
        emptyToNull(body.notes),
      ],
    );
    return json(res, 201, normalizeTrade(result.rows[0]));
  }

  if (id && req.method === "DELETE") {
    const result = await query("DELETE FROM trades WHERE id = $1", [id]);
    if (result.rowCount === 0) return json(res, 404, { error: "Trade not found" });
    return res.status(204).end();
  }

  if (id && req.method === "PUT") {
    const body = readBody<TradeBody>(req);
    const existing = await query(`SELECT ${tradeColumns} FROM trades WHERE id = $1`, [id]);
    if (!existing.rowCount) return json(res, 404, { error: "Trade not found" });

    const updates: string[] = [];
    const values: QueryParam[] = [];
    addUpdate(updates, values, "game", body.game);
    addUpdate(updates, values, "item_name", body.item_name);
    addUpdate(updates, values, "entry_price", body.entry_price === undefined ? undefined : Number(body.entry_price));
    addUpdate(updates, values, "exit_price", body.exit_price === undefined ? undefined : Number(body.exit_price));
    addUpdate(updates, values, "quantity", body.quantity === undefined ? undefined : Number(body.quantity));
    addUpdate(updates, values, "trade_type", body.trade_type);
    addUpdate(updates, values, "trade_date", body.trade_date);
    addUpdate(updates, values, "notes", body.notes === undefined ? undefined : emptyToNull(body.notes));

    if (!updates.length) return json(res, 200, normalizeTrade(existing.rows[0]));

    values.push(id);
    const result = await query(
      `UPDATE trades SET ${updates.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING ${tradeColumns}`,
      values,
    );
    return json(res, 200, normalizeTrade(result.rows[0]));
  }

  return methodNotAllowed(res);
}

async function handlePortfolio(req: ApiRequest, res: ApiResponse, id?: string) {
  if (!id && req.method === "GET") {
    const result = await query(`SELECT ${portfolioColumns} FROM portfolio ORDER BY created_at DESC`);
    return json(res, 200, result.rows.map(normalizePortfolio));
  }

  if (!id && req.method === "POST") {
    const body = readBody<PortfolioBody>(req);
    const result = await query(
      `
        INSERT INTO portfolio (game, item_name, quantity, avg_buy_price, current_price)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${portfolioColumns}
      `,
      [
        String(body.game || ""),
        String(body.item_name || ""),
        Number(body.quantity || 1),
        Number(body.avg_buy_price),
        body.current_price === undefined || body.current_price === null || body.current_price === "" ? null : Number(body.current_price),
      ],
    );
    return json(res, 201, normalizePortfolio(result.rows[0]));
  }

  if (id && req.method === "DELETE") {
    const result = await query("DELETE FROM portfolio WHERE id = $1", [id]);
    if (result.rowCount === 0) return json(res, 404, { error: "Portfolio item not found" });
    return res.status(204).end();
  }

  if (id && req.method === "PUT") {
    const body = readBody<PortfolioBody>(req);
    const existing = await query(`SELECT ${portfolioColumns} FROM portfolio WHERE id = $1`, [id]);
    if (!existing.rowCount) return json(res, 404, { error: "Portfolio item not found" });

    const updates: string[] = [];
    const values: QueryParam[] = [];
    addUpdate(updates, values, "game", body.game);
    addUpdate(updates, values, "item_name", body.item_name);
    addUpdate(updates, values, "quantity", body.quantity === undefined ? undefined : Number(body.quantity));
    addUpdate(updates, values, "avg_buy_price", body.avg_buy_price === undefined ? undefined : Number(body.avg_buy_price));
    addUpdate(
      updates,
      values,
      "current_price",
      body.current_price === undefined ? undefined : body.current_price === null || body.current_price === "" ? null : Number(body.current_price),
    );

    if (!updates.length) return json(res, 200, normalizePortfolio(existing.rows[0]));

    values.push(id);
    const result = await query(
      `UPDATE portfolio SET ${updates.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING ${portfolioColumns}`,
      values,
    );
    return json(res, 200, normalizePortfolio(result.rows[0]));
  }

  return methodNotAllowed(res);
}

async function handleCircles(req: ApiRequest, res: ApiResponse, id?: string) {
  if (!id && req.method === "GET") {
    const result = await query(`${circleSelect} GROUP BY c.id ORDER BY c.created_at DESC`);
    return json(res, 200, result.rows.map(normalizeCircle));
  }

  if (!id && req.method === "POST") {
    const body = readBody<CircleBody>(req);
    if (!body.name?.trim()) return json(res, 400, { error: "Circle name is required" });

    try {
      const circle = await withTransaction(async (client) => {
        const created = await client.query<{ id: string }>(
          "INSERT INTO trade_circles (name, notes) VALUES ($1, $2) RETURNING id::text",
          [body.name!.trim(), emptyToNull(body.notes)],
        );
        const circleId = created.rows[0].id;
        await attachTradesToCircle(client, circleId, body.tradeIds || []);
        return getCircle(client, circleId);
      });

      return json(res, 201, normalizeCircle(circle));
    } catch (error) {
      return json(res, 400, { error: (error as Error).message || "Failed to create circle" });
    }
  }

  if (id && req.method === "PUT") {
    const body = readBody<CircleBody>(req);
    const existing = await query("SELECT id::text, name, notes FROM trade_circles WHERE id = $1", [id]);
    if (!existing.rowCount) return json(res, 404, { error: "Circle not found" });
    if (body.name !== undefined && !body.name.trim()) return json(res, 400, { error: "Circle name cannot be empty" });

    try {
      const circle = await withTransaction(async (client) => {
        await client.query(
          "UPDATE trade_circles SET name = COALESCE($1, name), notes = $2, updated_at = now() WHERE id = $3",
          [body.name?.trim() || null, body.notes === undefined ? existing.rows[0].notes : emptyToNull(body.notes), id],
        );

        if (body.tradeIds !== undefined) {
          await client.query("DELETE FROM trade_circle_items WHERE circle_id = $1", [id]);
          await attachTradesToCircle(client, id, body.tradeIds);
        }

        return getCircle(client, id);
      });

      return json(res, 200, normalizeCircle(circle));
    } catch (error) {
      return json(res, 400, { error: (error as Error).message || "Failed to update circle" });
    }
  }

  if (id && req.method === "DELETE") {
    const result = await query("DELETE FROM trade_circles WHERE id = $1", [id]);
    if (result.rowCount === 0) return json(res, 404, { error: "Circle not found" });
    return res.status(204).end();
  }

  return methodNotAllowed(res);
}

async function handleScreener(req: ApiRequest, res: ApiResponse, action?: string, subResource?: string) {
  const route = [action, subResource].filter(Boolean).join("/");
  if (req.method !== "GET") return methodNotAllowed(res);
  if (route === "scan") return json(res, 200, await runScan());
  if (route === "config") {
    const config = getScannerConfig();
    return json(res, 200, {
      currency: config.currency,
      maxOpportunities: config.maxOpportunities,
      fees: config.fees,
      enabledSources: {
        skinport: config.skinportEnabled,
        dmarket: config.dmarketEnabled,
        rusttm: config.rusttmEnabled,
        lootfarm: config.lootfarmEnabled,
        steam: config.steamEnabled,
      },
    });
  }
  return notFound(res);
}

async function attachTradesToCircle(client: PoolClient, circleId: string, tradeIds: string[]) {
  for (const tradeId of tradeIds) {
    const trade = await client.query("SELECT id FROM trades WHERE id = $1", [tradeId]);
    if (!trade.rowCount) throw new Error(`Trade not found: ${tradeId}`);

    const linked = await client.query<{ circle_id: string }>("SELECT circle_id::text FROM trade_circle_items WHERE trade_id = $1", [tradeId]);
    if (linked.rowCount && linked.rows[0].circle_id !== circleId) {
      throw new Error(`Trade already belongs to another circle: ${tradeId}`);
    }

    await client.query("INSERT INTO trade_circle_items (circle_id, trade_id) VALUES ($1, $2) ON CONFLICT (trade_id) DO NOTHING", [
      circleId,
      tradeId,
    ]);
  }
}

async function getCircle(client: PoolClient, id: string) {
  const result = await client.query(`${circleSelect} WHERE c.id = $1 GROUP BY c.id`, [id]);
  if (!result.rowCount) throw new Error("Circle not found");
  return result.rows[0];
}

function addUpdate(updates: string[], values: QueryParam[], column: string, value: QueryParam | undefined) {
  if (value === undefined) return;
  values.push(value);
  updates.push(`${column} = $${values.length}`);
}

function emptyToNull(value: unknown): QueryParam {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "boolean" || value instanceof Date) return value;
  if (typeof value !== "string") return String(value);
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeTrade(row: QueryResultRow) {
  return {
    ...row,
    entry_price: Number(row.entry_price),
    exit_price: Number(row.exit_price),
    quantity: Number(row.quantity),
    trade_date: toIso(row.trade_date),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function normalizePortfolio(row: QueryResultRow) {
  return {
    ...row,
    quantity: Number(row.quantity),
    avg_buy_price: Number(row.avg_buy_price),
    current_price: row.current_price === null || row.current_price === undefined ? null : Number(row.current_price),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function normalizeCircle(row: QueryResultRow) {
  const trades = Array.isArray(row.trades) ? row.trades : JSON.parse(String(row.trades || "[]"));
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    trades: trades.map(normalizeTrade),
  };
}

type TradeBody = {
  game?: string;
  item_name?: string;
  entry_price?: number | string;
  exit_price?: number | string;
  quantity?: number | string;
  trade_type?: "buy" | "sell" | "pending";
  trade_date?: string;
  notes?: string | null;
};

type PortfolioBody = {
  game?: string;
  item_name?: string;
  quantity?: number | string;
  avg_buy_price?: number | string;
  current_price?: number | string | null;
};

type CircleBody = {
  name?: string;
  notes?: string | null;
  tradeIds?: string[];
};
