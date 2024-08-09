import express from 'express';
const router = express.Router();

import userRoute from './user.route';
import dataRoute from './data.route';
import tradeRoute from './trade.route';
import tradingAccountRoute from './tradingAccount.route';
import tradeAnalysisRoute from './tradeAnalysis.route';
/**
 * Function contains Application routes
 *
 * @returns router
 */
const routes = () => {
  router.get('/', (req, res) => {
    res.json('Welcome');
  });
  router.use('/users', userRoute);
  router.use('/dataCenter', dataRoute);
  router.use('/tradingAccounts', tradingAccountRoute);
  router.use('/trades', tradeRoute);
  router.use('/tradeAnalysis', tradeAnalysisRoute);
  return router;
};

export default routes;
