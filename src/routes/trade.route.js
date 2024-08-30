import express from 'express';
import { userAuth } from '../middlewares/auth.middleware';
import * as tradeController from '../controllers/trade.controller';
import { newTradeValidator } from '../validators/trade.validator';

const router = express.Router();

router.post('', userAuth, tradeController.groupTrade);
router.post(
  '/:brokerAccountId',
  newTradeValidator,
  userAuth,
  tradeController.createTrade
);
router.get('/user-trade', userAuth, tradeController.getAllTradeOfUser);
router.put('/:tradeId', userAuth, tradeController.updateTrade);
// router.get('/', userAuth, tradeController.getAllTradeOfUser);
router.get('/getAllTradeGroup', userAuth, tradeController.getAllTradeGroup);
router.get(
  '/:tradingAccountId',
  userAuth,
  tradeController.getAllTradeByBrokerAccount
);
router.post('/:tradeId/exit', userAuth, tradeController.createExit);
router.put(
  '/:groupTradeId/:tradeId',
  userAuth,
  tradeController.updateGroupTrade
);

export default router;
