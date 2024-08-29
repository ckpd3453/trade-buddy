import * as tradingAccountService from '../services/tradingAccount.service';

export const getAllBrokerAccountList = async (req, res) => {
  const data = await tradingAccountService.getAllBrokerAccountList(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const createBrokerAccount = async (req, res) => {
  const data = await tradingAccountService.createBrokerAccount(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const trashBrokerAccount = async (req, res) => {
  const data = await tradingAccountService.trashBrokerAccount(req.params._id);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};
