import express from 'express';
import { userAuth } from '../middlewares/auth.middleware';

import * as tradingAccountController from '../controllers/tradingAccount.controller';
import { newTradingAccountValidator } from '../validators/tradingAccount.validator';

const router = express.Router();

//Add-Account-Name
router.post(
  '',
  newTradingAccountValidator,
  userAuth,
  tradingAccountController.createBrokerAccount
);

router.get('', userAuth, tradingAccountController.getAllBrokerAccountList);

router.put('/:_id', userAuth, tradingAccountController.trashBrokerAccount);

export default router;
