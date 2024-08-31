import express from 'express';
import { userAuth } from '../middlewares/auth.middleware';
import * as tradeController from '../controllers/trade.controller';
import { newGroupTradeValidator } from '../validators/groupTrade.validator';

const router = express.Router();

//Create group of Trade
router.post('', newGroupTradeValidator, userAuth, tradeController.groupTrade);

//Get All Group Trade
router.get('', userAuth, tradeController.getAllTradeGroup);

//Update Group Trade to add trade or rename groupName
router.put(
  '/:groupTradeId',
  newGroupTradeValidator,
  userAuth,
  tradeController.updateGroupTrade
);

//To Mark Group Trade as deleted
router.put('/delete/:groupTradeId', userAuth, tradeController.deleteGropTrade);

//remove trade from groupTrade.
router.put(
  '/remove/:groupTradeId',
  userAuth,
  tradeController.removeTradeFromGroup
);

export default router;
