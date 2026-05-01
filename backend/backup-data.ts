import db from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Export trades
const trades = db.prepare('SELECT * FROM trades').all();
fs.writeFileSync(path.join(__dirname, 'data/trades-backup.json'), JSON.stringify(trades, null, 2));
console.log(`Exported ${trades.length} trades`);

// Export portfolio
try {
  const portfolio = db.prepare('SELECT * FROM portfolio').all();
  fs.writeFileSync(path.join(__dirname, 'data/portfolio-backup.json'), JSON.stringify(portfolio, null, 2));
  console.log(`Exported ${portfolio.length} portfolio items`);
} catch (e) {
  console.log('No portfolio table found');
}

console.log('Backup complete!');
