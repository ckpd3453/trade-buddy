import * as tradingAccountService from '../services/tradingAccount.service';

export const getAllTradingAccountList = async (req, res) => {
  const data = await tradingAccountService.getAllTradingAccountList(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const createTradingAccount = async (req, res) => {
  const data = await tradingAccountService.createTradingAccount(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};
