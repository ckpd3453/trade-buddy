import express from 'express';
import { userAuth } from '../middlewares/auth.middleware';

import * as tradingAccountController from '../controllers/tradingAccount.controller';

const router = express.Router();

//Add-Account-Name
router.post('', userAuth, tradingAccountController.createTradingAccount);

router.get('', userAuth, tradingAccountController.getAllTradingAccountList);

export default router;
