import * as tradeAnalysis from '../services/tradeAnalysis.service';

export const getTradeAnalysis = async (req, res) => {
  const data = await tradeAnalysis.getAllTradeAnalysis(req.params);

  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const getTransactionByInstrumentGraph = async (req, res) => {
  const data = await tradeAnalysis.getTransactionByInstrumentGraph(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const profitAndLossGraph = async (req, res) => {
  const data = await tradeAnalysis.profitAndLossGraph(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};
