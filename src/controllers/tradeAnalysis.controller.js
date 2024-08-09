import * as tradeAnalysis from '../services/tradeAnalysis.service';

export const getTradeAnalysis = async (req, res) => {
  const data = await tradeAnalysis.getAllTradeAnalysis(req.params);

  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};
