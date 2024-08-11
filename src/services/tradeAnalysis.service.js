import Trade from '../models/trade.model';
import TradeAnalysis from '../models/tradeAnalysis.model';
import HttpStatus from 'http-status-codes';
import { getAllTradeOfUser } from './trade.service';
import exitModel from '../models/exit.model';
import moment from 'moment';

export const getAllTradeAnalysis = async (tradeId) => {
  try {
    // Fetch the trade document
    const trade = await Trade.findById(tradeId);

    if (!trade) {
      return {
        code: HttpStatus.NOT_FOUND,
        message: 'Trade not found'
      };
    }

    // If there are no exits, return default analysis
    if (!trade.exit || trade.exit.length === 0) {
      const defaultAnalysis = {
        tradeId: tradeId,
        exitAnalyses: [],
        overallAnalysis: {
          cumulativeExitQuantity: 0,
          remainingQuantity: trade.tradeQuantity,
          message: 'No exits found for this trade'
        }
      };

      return {
        code: HttpStatus.OK,
        data: defaultAnalysis,
        message: 'No exits found for the trade. Default analysis returned.'
      };
    }

    // Initialize cumulative values
    let cumulativeExitQuantity = 0;
    let overallAnalysis = null;
    let exitAnalyses = [];

    // Fetch trade analysis for each exit
    const analysisPromises = trade.exit.map(async (exitObj) => {
      try {
        const tradeAnalysis = await TradeAnalysis.findOne({
          exitId: exitObj
        });

        if (!tradeAnalysis) {
          return {
            error: `Trade analysis for exit ID ${exitObj} not found`
          };
        }

        cumulativeExitQuantity += tradeAnalysis.exitQuantity;

        exitAnalyses.push(tradeAnalysis); // Collect the analysis for this exit

        return tradeAnalysis;
      } catch (error) {
        return {
          error: `Error processing exit with ID ${exitObj}: ${error.message}`
        };
      }
    });

    // Wait for all the exit analyses to complete
    const analysisResults = await Promise.all(analysisPromises);

    // Filter out any error responses
    exitAnalyses = analysisResults.filter((item) => !item.error);

    // Perform overall analysis based on cumulative data
    if (cumulativeExitQuantity > 0) {
      const remainingQuantity = trade.tradeQuantity - cumulativeExitQuantity;
      overallAnalysis = {
        tradeId: tradeId,
        cumulativeExitQuantity: cumulativeExitQuantity,
        remainingQuantity: remainingQuantity
        // Additional overall calculations can be added here
      };
    }

    return {
      code: HttpStatus.OK,
      data: {
        exitAnalyses: exitAnalyses,
        overallAnalysis: overallAnalysis
      },
      message: 'Trade analysis completed successfully'
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: `An error occurred while processing the trade analysis: ${error.message}`
    };
  }
};

function stripTime(date) {
  const strippedDate = new Date(date);
  strippedDate.setHours(0, 0, 0, 0); // Set time to midnight
  return strippedDate;
}

export const getTransactionByInstrumentGraph = async (body) => {
  const trades = await getAllTradeOfUser(body);

  const currentDate = new Date();
  const tradeDuration = 200;
  const filteredTrade = getLatestTrades(trades, currentDate, tradeDuration);
  const tradeCountOnMarketBase = await getTradeCountOnMarketBasedByDate(
    filteredTrade
  );

  return {
    code: HttpStatus.OK,
    data: tradeCountOnMarketBase,
    message: 'Trade counts retrieved successfully by date and market.'
  };
};

function getLatestTrades(trades, currentDate, tradeDuration) {
  return trades.data.filter((trade) => {
    const entryDate = new Date(trade.entryDate);
    const timeDifference = stripTime(currentDate) - stripTime(entryDate);
    const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
    return daysDifference <= tradeDuration;
  });
}

async function getTradeCountOnMarketBasedByDate(trades) {
  let tradeCountByDateAndMarket = {};

  for (const trade of trades) {
    const market = trade.market.toLowerCase();
    const entryDate = moment(trade.entryDate).format('YYYY-MM-DD');

    if (!tradeCountByDateAndMarket[entryDate]) {
      tradeCountByDateAndMarket[entryDate] = {
        equity: { count: 0, ProfitCount: 0, LossCount: 0 },
        equityFeatures: { count: 0, ProfitCount: 0, LossCount: 0 },
        equityOptions: { count: 0, ProfitCount: 0, LossCount: 0 },
        commodity: { count: 0, ProfitCount: 0, LossCount: 0 },
        commodityFutures: { count: 0, ProfitCount: 0, LossCount: 0 }
      };
    }

    const tradeAnalysis = await getAllTradeAnalysis(trade._id);
    let totalProfitLoss = 0;
    if (tradeAnalysis.data.exitAnalyses.length > 0) {
      tradeAnalysis.data.exitAnalyses.forEach((exitAnalysis) => {
        totalProfitLoss +=
          exitAnalysis.profitClosedPosition + exitAnalysis.lossClosedPosition;
      });
    }

    const marketData = tradeCountByDateAndMarket[entryDate][market];

    if (marketData) {
      marketData.count += 1;
      if (totalProfitLoss > 0) {
        marketData.ProfitCount += 1;
      } else {
        marketData.LossCount += 1;
      }
    }
  }

  return tradeCountByDateAndMarket;
}

export const profitAndLossGraph = async (body) => {
  const trades = await getAllTradeOfUser(body);

  const currentDate = new Date();
  const tradeDuration = 200;
  const filteredTrade = getLatestTrades(trades, currentDate, tradeDuration);

  const profitAndLossOfTrades = await getTradeProfitAndLossOnMarketBasedByDate(
    filteredTrade
  );

  return {
    code: HttpStatus.OK,
    data: profitAndLossOfTrades,
    message: 'Fetched Profit and Loss of trades for the latest 200 days'
  };
};

async function getTradeProfitAndLossOnMarketBasedByDate(trades) {
  let profitLossByDate = {};

  for (const trade of trades) {
    const market = trade.market.toLowerCase();

    const entryDate = moment(trade.entryDate).format('YYYY-MM-DD');

    if (!profitLossByDate[entryDate]) {
      profitLossByDate[entryDate] = {
        equity: {
          totalProfit: 0,
          totalLoss: 0,
          amountProfit: 0,
          amountLoss: 0
        },
        equityFeatures: {
          totalProfit: 0,
          totalLoss: 0,
          amountProfit: 0,
          amountLoss: 0
        },
        equityOptions: {
          totalProfit: 0,
          totalLoss: 0,
          amountProfit: 0,
          amountLoss: 0
        },
        commodity: {
          totalProfit: 0,
          totalLoss: 0,
          amountProfit: 0,
          amountLoss: 0
        },
        commodityFutures: {
          totalProfit: 0,
          totalLoss: 0,
          amountProfit: 0,
          amountLoss: 0
        }
      };
    }

    const tradeAnalysis = await getAllTradeAnalysis(trade._id);
    const exitTrade = await exitModel.findById(trade.exit);

    let totalProfitLoss = 0;
    let totalAmountProfit = 0;
    let totalAmountLoss = 0;

    if (tradeAnalysis.data.exitAnalyses.length > 0) {
      tradeAnalysis.data.exitAnalyses.forEach((exitAnalysis) => {
        const profitLoss =
          exitAnalysis.profitClosedPosition + exitAnalysis.lossClosedPosition;
        totalProfitLoss += profitLoss;

        if (profitLoss >= 0) {
          totalAmountProfit += profitLoss * exitTrade.quantity;
        } else {
          totalAmountLoss += Math.abs(profitLoss * exitTrade.quantity);
        }
      });
    }

    const marketData = profitLossByDate[entryDate][market];
    if (marketData) {
      if (totalProfitLoss > 0) {
        marketData.totalProfit += totalProfitLoss;
        marketData.amountProfit += totalAmountProfit;
      } else {
        marketData.totalLoss += Math.abs(totalProfitLoss);
        marketData.amountLoss += totalAmountLoss;
      }
    }
  }

  return profitLossByDate;
}
