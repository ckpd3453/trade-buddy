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

router.get('/instrument_graph/p&l', userAuth, tradeAnalysis.profitAndLossGraph);

export default router;
