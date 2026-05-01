import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import tradesRouter from './routes/trades.js';
import portfolioRouter from './routes/portfolio.js';
import circlesRouter from './routes/circles.js';
import screenerRouter from './routes/screener.js';

// Run migrations on startup.
import('./migrate.js');

const app = express();
const PORT = process.env.PORT || 7331;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(__dirname, '..', 'dist');

app.use(cors());
app.use(express.json());

app.use('/api/trades', tradesRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/circles', circlesRouter);
app.use('/api/screener', screenerRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// One-system mode: the backend serves the built React frontend too.
if (process.env.SERVE_FRONTEND !== 'false') {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
