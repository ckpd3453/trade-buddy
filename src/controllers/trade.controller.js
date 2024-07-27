import * as TradeService from '../services/trade.service';

export const getAllTrade = async (req, res) => {
  const data = await TradeService.getAllTrade(
    req.params.tradingAccountId,
    req.body
  );
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const createTrade = async (req, res) => {
  console.log('------------------->>>>>>>>>>>>>In Controller');

  const data = await TradeService.createTrade(
    req.params.tradingAccountId,
    req.body
  );
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
