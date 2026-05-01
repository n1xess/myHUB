import { Router, Request, Response } from 'express';
import { getScannerConfig } from '../scanner/config.js';
import { runScan } from '../scanner/scanner.js';

const router = Router();

router.get('/config', (_req: Request, res: Response) => {
  const config = getScannerConfig();
  res.json({
    currency: config.currency,
    steamEnabled: config.steamEnabled,
    skinportEnabled: config.skinportEnabled,
    dmarketEnabled: config.dmarketEnabled,
    rusttmEnabled: config.rusttmEnabled,
    lootfarmEnabled: config.lootfarmEnabled,
    maxOpportunities: config.maxOpportunities,
    fees: config.fees,
  });
});

router.get('/scan', async (_req: Request, res: Response) => {
  try {
    res.json(await runScan());
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
