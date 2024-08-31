import express from 'express';
import { userAuth } from '../middlewares/auth.middleware';
import * as tradeController from '../controllers/trade.controller';
import { newTradeValidator } from '../validators/trade.validator';
import { newGroupTradeValidator } from '../validators/groupTrade.validator';

const router = express.Router();

//Create group of Trade
router.post('', newGroupTradeValidator, userAuth, tradeController.groupTrade);

//Add Trade to a given broker account
router.post(
  '/:brokerAccountId',
  newTradeValidator,
  userAuth,
  tradeController.createTrade
);

//Get All Trade of a User
router.get('/user-trade', userAuth, tradeController.getAllTradeOfUser);

//Update Trade
router.put('/:tradeId', userAuth, tradeController.updateTrade);

//Delete Trade
router.put('/delete/:tradeId', userAuth, tradeController.deleteTrade);
// router.get('/', userAuth, tradeController.getAllTradeOfUser);

//Get All Group Trade
router.get('/getAllTradeGroup', userAuth, tradeController.getAllTradeGroup);

//Get All trade of a broker
router.get(
  '/:tradingAccountId',
  userAuth,
  tradeController.getAllTradeByBrokerAccount
);

//Add Exit to a given trade
router.post('/:tradeId/exit', userAuth, tradeController.createExit);

//Update Group Trade
router.put(
  '/:groupTradeId',
  newGroupTradeValidator,
  userAuth,
  tradeController.updateGroupTrade
);

//remove trade from groupTrade
router.put(
  '/group-trade/remove/:groupTradeId',
  userAuth,
  tradeController.removeTradeFromGroup
);

export default router;
