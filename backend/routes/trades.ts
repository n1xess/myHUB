import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

// Get all trades
router.get('/', (req: Request, res: Response) => {
  const trades = db.prepare('SELECT * FROM trades ORDER BY trade_date DESC').all();
  res.json(trades);
});

// Create trade
router.post('/', (req: Request, res: Response) => {
  const { game, item_name, entry_price, exit_price, quantity, trade_type, trade_date, notes } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO trades (game, item_name, entry_price, exit_price, quantity, trade_type, trade_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `);
  
  const trade = stmt.get(
    game,
    item_name,
    Number(entry_price),
    Number(exit_price),
    quantity || 1,
    trade_type || 'buy',
    trade_date || new Date().toISOString(),
    notes || null
  );
  
  res.status(201).json(trade);
});

// Delete trade
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM trades WHERE id = ?').run(id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Trade not found' });
  }
  
  res.status(204).send();
});

// Update trade
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { game, item_name, entry_price, exit_price, quantity, trade_type, trade_date, notes } = req.body;
  
  const existing = db.prepare('SELECT * FROM trades WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Trade not found' });
  }
  
  const updates: string[] = [];
  const values: unknown[] = [];
  
  if (game !== undefined) { updates.push('game = ?'); values.push(game); }
  if (item_name !== undefined) { updates.push('item_name = ?'); values.push(item_name); }
  if (entry_price !== undefined) { updates.push('entry_price = ?'); values.push(Number(entry_price)); }
  if (exit_price !== undefined) { updates.push('exit_price = ?'); values.push(Number(exit_price)); }
  if (quantity !== undefined) { updates.push('quantity = ?'); values.push(quantity); }
  if (trade_type !== undefined) { updates.push('trade_type = ?'); values.push(trade_type); }
  if (trade_date !== undefined) { updates.push('trade_date = ?'); values.push(trade_date); }
  if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
  
  if (updates.length === 0) {
    return res.json(existing);
  }
  
  values.push(id);
  const stmt = db.prepare(`UPDATE trades SET ${updates.join(', ')} WHERE id = ? RETURNING *`);
  const trade = stmt.get(...values);
  
  res.json(trade);
});

export default router;
