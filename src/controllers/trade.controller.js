import * as TradeService from '../services/trade.service';
import { responseObj } from '../utils/responseDto';

export const getAllTradeByBrokerAccount = async (req, res) => {
  const data = await TradeService.getAllTradeByBrokerAccount(
    req.params.tradingAccountId
  );
  res.status(data.code).json(responseObj(data));
};

export const getAllTradeOfUser = async (req, res) => {
  const data = await TradeService.getAllTradeOfUser(req.body);
  res.status(data.code).json(responseObj(data));
};

export const createTrade = async (req, res) => {
  const data = await TradeService.createTrade(
    req.params.brokerAccountId,
    req.body
  );
  res.status(data.code).json(responseObj(data));
};

export const updateTrade = async (req, res) => {
  const data = await TradeService.updateTrade(req.params.tradeId, req.body);
  res.status(data.code).json(responseObj(data));
};

export const deleteTrade = async (req, res) => {
  const data = await TradeService.deleteTrade(req.params.tradeId);
  res.status(data.code).json(responseObj(data));
};

export const groupTrade = async (req, res) => {
  const data = await TradeService.groupTrade(req.body);
  res.status(data.code).json(responseObj(data));
};

// New controller function to create exit data
export const createExit = async (req, res) => {
  const data = await TradeService.createExit(req.params.tradeId, req.body);
  res.status(data.code).json(responseObj(data));
};

// New controller function to get all group trades
export const getAllTradeGroup = async (req, res) => {
  const data = await TradeService.getAllTradeGroup(req.body);
  res.status(data.code).json(responseObj(data));
};

export const updateGroupTrade = async (req, res) => {
  const data = await TradeService.updateGroupTrade(
    req.params.groupTradeId,
    req.body
  );
  res.status(data.code).json(responseObj(data));
};

export const deleteGropTrade = async (req, res) => {
  const data = await TradeService.deleteGroupTrade(req.params.groupTradeId);
  res.status(data.code).json(responseObj(data));
};

export const removeTradeFromGroup = async (req, res) => {
  const data = await TradeService.removeTradeFromGroup(
    req.params.groupTradeId,
    req.body.trades
  );
  res.status(data.code).json(responseObj(data));
};
