import * as tradeAnalysis from '../services/tradeAnalysis.service';
import { responseObj } from '../utils/responseDto';

export const getTradeAnalysis = async (req, res) => {
  const data = await tradeAnalysis.getAllTradeAnalysis(req.params);

  res.status(data.code).json(responseObj(data));
};

export const getTransactionByInstrumentGraph = async (req, res) => {
  const data = await tradeAnalysis.getTransactionByInstrumentGraph(req.body);
  res.status(data.code).json(responseObj(data));
};

export const profitAndLossGraph = async (req, res) => {
  const data = await tradeAnalysis.profitAndLossGraph(req.body);
  res.status(data.code).json(responseObj(data));
};

export const strategyPerformanceGraph = async (req, res) => {
  const data = await tradeAnalysis.strategyGraph(req.body);
  res.status(data.code).json(responseObj(data));
};
