import * as TradeService from '../services/trade.service';

export const getAllTradeByBrokerAccount = async (req, res) => {
  const data = await TradeService.getAllTradeByBrokerAccount(
    req.params.tradingAccountId
  );
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const getAllTradeOfUser = async (req, res) => {
  const data = await TradeService.getAllTradeOfUser(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const createTrade = async (req, res) => {
  const data = await TradeService.createTrade(
    req.params.brokerAccountId,
    req.body
  );
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const updateTrade = async (req, res) => {
  const data = await TradeService.updateTrade(req.params.tradeId, req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const deleteTrade = async (req, res) => {
  const data = await TradeService.deleteTrade(req.params.tradeId);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const groupTrade = async (req, res) => {
  const data = await TradeService.groupTrade(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

// New controller function to create exit data
export const createExit = async (req, res) => {
  const data = await TradeService.createExit(req.params.tradeId, req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

// New controller function to get all group trades
export const getAllTradeGroup = async (req, res) => {
  const data = await TradeService.getAllTradeGroup(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const updateGroupTrade = async (req, res) => {
  const data = await TradeService.updateGroupTrade(
    req.params.groupTradeId,
    req.params.tradeId
  );
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};
