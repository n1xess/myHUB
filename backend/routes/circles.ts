import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

type CircleRecord = {
  id: string;
  name: string;
  notes: string | null;
};

type CircleWithTradesRecord = CircleRecord & {
  created_at: string;
  updated_at: string;
  trades: string | null;
};

const circleQuery = `
  SELECT
    c.*,
    COALESCE(
      json_group_array(
        CASE
          WHEN t.id IS NOT NULL THEN json_object(
            'id', t.id,
            'game', t.game,
            'item_name', t.item_name,
            'entry_price', t.entry_price,
            'exit_price', t.exit_price,
            'quantity', t.quantity,
            'trade_type', t.trade_type,
            'trade_date', t.trade_date,
            'notes', t.notes,
            'created_at', t.created_at,
            'updated_at', t.updated_at
          )
        END
      ),
      '[]'
    ) AS trades
  FROM trade_circles c
  LEFT JOIN trade_circle_items ci ON ci.circle_id = c.id
  LEFT JOIN trades t ON t.id = ci.trade_id
  GROUP BY c.id
  ORDER BY c.created_at DESC
`;

const singleCircleQuery = `
  SELECT
    c.*,
    COALESCE(
      json_group_array(
        CASE
          WHEN t.id IS NOT NULL THEN json_object(
            'id', t.id,
            'game', t.game,
            'item_name', t.item_name,
            'entry_price', t.entry_price,
            'exit_price', t.exit_price,
            'quantity', t.quantity,
            'trade_type', t.trade_type,
            'trade_date', t.trade_date,
            'notes', t.notes,
            'created_at', t.created_at,
            'updated_at', t.updated_at
          )
        END
      ),
      '[]'
    ) AS trades
  FROM trade_circles c
  LEFT JOIN trade_circle_items ci ON ci.circle_id = c.id
  LEFT JOIN trades t ON t.id = ci.trade_id
  WHERE c.id = ?
  GROUP BY c.id
`;

function normalizeCircle(row: CircleWithTradesRecord) {
  const rawTrades = JSON.parse(row.trades ?? '[]');
  const trades = rawTrades.filter(Boolean);
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    trades,
  };
}

function normalizeNotes(notes: string | null | undefined) {
  if (typeof notes !== 'string') return null;
  const trimmed = notes.trim();
  return trimmed || null;
}

router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare(circleQuery).all() as CircleWithTradesRecord[];
  res.json(rows.map(normalizeCircle));
});

router.post('/', (req: Request, res: Response) => {
  const { name, notes, tradeIds } = req.body as { name?: string; notes?: string | null; tradeIds?: string[] };

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Circle name is required' });
  }

  const insertCircle = db.prepare(`
    INSERT INTO trade_circles (name, notes)
    VALUES (?, ?)
    RETURNING id
  `);
  const getCircle = db.prepare(singleCircleQuery);
  const insertItem = db.prepare(`
    INSERT INTO trade_circle_items (circle_id, trade_id)
    VALUES (?, ?)
  `);
  const existingTradeLink = db.prepare('SELECT trade_id FROM trade_circle_items WHERE trade_id = ?');
  const tradeExists = db.prepare('SELECT id FROM trades WHERE id = ?');

  try {
    const result = db.transaction(() => {
      const created = insertCircle.get(name.trim(), normalizeNotes(notes)) as { id: string };
      const circleId = created.id;

      for (const tradeId of tradeIds ?? []) {
        if (!tradeExists.get(tradeId)) {
          throw new Error(`Trade not found: ${tradeId}`);
        }
        if (existingTradeLink.get(tradeId)) {
          throw new Error(`Trade already belongs to another circle: ${tradeId}`);
        }
        insertItem.run(circleId, tradeId);
      }

      return getCircle.get(circleId) as CircleWithTradesRecord;
    })();

    res.status(201).json(normalizeCircle(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create circle';
    res.status(400).json({ error: message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, notes, tradeIds } = req.body as { name?: string; notes?: string | null; tradeIds?: string[] };

  const existingCircle = db.prepare('SELECT * FROM trade_circles WHERE id = ?').get(id) as CircleRecord | undefined;
  if (!existingCircle) {
    return res.status(404).json({ error: 'Circle not found' });
  }

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: 'Circle name cannot be empty' });
  }

  const updateCircle = db.prepare(`
    UPDATE trade_circles
    SET name = ?, notes = ?
    WHERE id = ?
  `);
  const clearItems = db.prepare('DELETE FROM trade_circle_items WHERE circle_id = ?');
  const insertItem = db.prepare('INSERT INTO trade_circle_items (circle_id, trade_id) VALUES (?, ?)');
  const existingTradeLink = db.prepare('SELECT circle_id FROM trade_circle_items WHERE trade_id = ?');
  const tradeExists = db.prepare('SELECT id FROM trades WHERE id = ?');
  const getCircle = db.prepare(singleCircleQuery);

  try {
    const circle = db.transaction(() => {
      updateCircle.run(
        name?.trim() ?? existingCircle.name,
        notes === undefined ? existingCircle.notes : normalizeNotes(notes),
        id
      );

      if (tradeIds !== undefined) {
        clearItems.run(id);
        for (const tradeId of tradeIds) {
          if (!tradeExists.get(tradeId)) {
            throw new Error(`Trade not found: ${tradeId}`);
          }
          const linked = existingTradeLink.get(tradeId) as { circle_id: string } | undefined;
          if (linked && linked.circle_id !== id) {
            throw new Error(`Trade already belongs to another circle: ${tradeId}`);
          }
          insertItem.run(id, tradeId);
        }
      }

      return getCircle.get(id) as CircleWithTradesRecord;
    })();

    res.json(normalizeCircle(circle));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update circle';
    res.status(400).json({ error: message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM trade_circles WHERE id = ?').run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Circle not found' });
  }

  res.status(204).send();
});

export default router;
