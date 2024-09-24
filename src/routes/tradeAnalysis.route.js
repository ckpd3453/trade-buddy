import express from 'express';
import { userAuth } from '../middlewares/auth.middleware';
import * as tradeAnalysis from '../controllers/tradeAnalysis.controller';

const router = express.Router();

router.get(
  '/instrument_graph',
  userAuth,
  tradeAnalysis.getTransactionByInstrumentGraph
);
router.get('/:_id', userAuth, tradeAnalysis.getTradeAnalysis);

router.put('/instrument_graph/p&l', userAuth, tradeAnalysis.profitAndLossGraph);

router.get(
  '/strategy_graph/p&l',
  userAuth,
  tradeAnalysis.strategyPerformanceGraph
);

export default router;
