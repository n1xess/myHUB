import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

// Get all portfolio items
router.get('/', (req: Request, res: Response) => {
  const items = db.prepare('SELECT * FROM portfolio ORDER BY created_at DESC').all();
  res.json(items);
});

// Create portfolio item
router.post('/', (req: Request, res: Response) => {
  const { game, item_name, quantity, avg_buy_price, current_price } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO portfolio (game, item_name, quantity, avg_buy_price, current_price)
    VALUES (?, ?, ?, ?, ?)
    RETURNING *
  `);
  
  const item = stmt.get(
    game,
    item_name,
    quantity || 1,
    Number(avg_buy_price),
    current_price ? Number(current_price) : null
  );
  
  res.status(201).json(item);
});

// Update portfolio item
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { game, item_name, quantity, avg_buy_price, current_price } = req.body;
  
  const existing = db.prepare('SELECT * FROM portfolio WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Portfolio item not found' });
  }
  
  const updates: string[] = [];
  const values: unknown[] = [];
  
  if (game !== undefined) { updates.push('game = ?'); values.push(game); }
  if (item_name !== undefined) { updates.push('item_name = ?'); values.push(item_name); }
  if (quantity !== undefined) { updates.push('quantity = ?'); values.push(quantity); }
  if (avg_buy_price !== undefined) { updates.push('avg_buy_price = ?'); values.push(Number(avg_buy_price)); }
  if (current_price !== undefined) { updates.push('current_price = ?'); values.push(current_price ? Number(current_price) : null); }
  
  if (updates.length === 0) {
    return res.json(existing);
  }
  
  values.push(id);
  const stmt = db.prepare(`UPDATE portfolio SET ${updates.join(', ')} WHERE id = ? RETURNING *`);
  const item = stmt.get(...values);
  
  res.json(item);
});

// Delete portfolio item
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM portfolio WHERE id = ?').run(id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Portfolio item not found' });
  }
  
  res.status(204).send();
});

export default router;
