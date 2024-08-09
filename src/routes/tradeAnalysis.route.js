import express from 'express';
import { userAuth } from '../middlewares/auth.middleware';
import * as tradeAnalysis from '../controllers/tradeAnalysis.controller';

const router = express.Router();

router.get('/:_id', userAuth, tradeAnalysis.getTradeAnalysis);
export default router;
