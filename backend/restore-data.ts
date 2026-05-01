import db from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import trades
const tradesData = fs.readFileSync(path.join(__dirname, 'data/trades-backup.json'), 'utf-8');
const trades = JSON.parse(tradesData);

const stmt = db.prepare(`
  INSERT INTO trades (id, game, item_name, entry_price, exit_price, quantity, trade_type, trade_date, notes, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((trades) => {
  for (const t of trades) {
    stmt.run(
      t.id,
      t.game,
      t.item_name,
      t.entry_price,
      t.exit_price,
      t.quantity,
      t.trade_type,
      t.trade_date,
      t.notes,
      t.created_at,
      t.updated_at
    );
  }
});

insertMany(trades);
console.log(`Imported ${trades.length} trades`);

// Import portfolio if exists
try {
  const portfolioPath = path.join(__dirname, 'data/portfolio-backup.json');
  if (fs.existsSync(portfolioPath)) {
    const portfolioData = fs.readFileSync(portfolioPath, 'utf-8');
    const portfolio = JSON.parse(portfolioData);
    
    if (portfolio.length > 0) {
      const pStmt = db.prepare(`
        INSERT INTO portfolio (id, game, item_name, quantity, avg_buy_price, current_price, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertPortfolio = db.transaction((items) => {
        for (const p of items) {
          pStmt.run(
            p.id,
            p.game,
            p.item_name,
            p.quantity,
            p.avg_buy_price,
            p.current_price,
            p.created_at,
            p.updated_at
          );
        }
      });
      
      insertPortfolio(portfolio);
      console.log(`Imported ${portfolio.length} portfolio items`);
    }
  }
} catch (e) {
  console.log('No portfolio data to import');
}

console.log('Import complete!');
