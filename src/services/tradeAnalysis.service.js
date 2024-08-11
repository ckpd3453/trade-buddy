import Trade from '../models/trade.model';
import TradeAnalysis from '../models/tradeAnalysis.model';
import HttpStatus from 'http-status-codes';
import { getAllTradeOfUser } from './trade.service';
import exitModel from '../models/exit.model';

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
  const tradeDuration = 10;
  const filteredTrade = getLatestTrades(trades, currentDate, tradeDuration);
  const tradeCountOnMarketBase = await getTradeCountOnMarketBased(
    filteredTrade
  );

  console.log('In InstrumentGraph', tradeCountOnMarketBase);

  let totalTrades = 0;
  let totalProfitCount = 0;
  let totalLossCount = 0;
  // Sum up the counts
  tradeCountOnMarketBase.forEach((market) => {
    const marketKey = Object.keys(market)[0]; // Get the market key (e.g., 'equity', 'equityFeatures')
    totalTrades += market[marketKey].count;
    totalProfitCount += market[marketKey].ProfitCount;
    totalLossCount += market[marketKey].LossCount;
  });

  return {
    code: HttpStatus.OK,
    data: {
      tradeCountOnMarketBase: tradeCountOnMarketBase,
      totalTrades: totalTrades,
      totalWin: totalProfitCount,
      totalLoss: totalLossCount
    },
    message: ''
  };
};

function getLatestTrades(trades, currentDate, tradeDuration) {
  const filteredTrade = trades.data.filter((trade) => {
    const entryDate = new Date(trade.entryDate);

    // Calculate the difference in milliseconds
    const timeDifference = stripTime(currentDate) - stripTime(entryDate);

    // Convert milliseconds to days
    const daysDifference = timeDifference / (1000 * 60 * 60 * 24);

    return daysDifference <= tradeDuration;
  });
  return filteredTrade;
}

async function getTradeCountOnMarketBased(trades) {
  let equity = {
    count: 0,
    ProfitCount: 0,
    LossCount: 0
  };
  let equityFeatures = {
    count: 0,
    ProfitCount: 0,
    LossCount: 0
  };
  let equityOptions = {
    count: 0,
    ProfitCount: 0,
    LossCount: 0
  };
  let commodityOptions = {
    count: 0,
    ProfitCount: 0,
    LossCount: 0
  };
  let commodityFutures = {
    count: 0,
    ProfitCount: 0,
    LossCount: 0
  };

  for (const trade of trades) {
    const market = trade.market.toLowerCase();

    if (market === 'equity') {
      equity.count += 1;
      let totalProfitLoss = 0;
      const tradeAnalysis = await getAllTradeAnalysis(trade._id);

      tradeAnalysis.exitAnalyses.forEach((exitAnalysis) => {
        totalProfitLoss +=
          exitAnalysis.profitClosedPosition + exitAnalysis.lossClosedPosition;
      });

      if (totalProfitLoss > 0) {
        equity.ProfitCount += 1;
      } else {
        equity.LossCount += 1;
      }
    } else if (market === 'equityfeatures') {
      equityFeatures.count += 1;
      let totalProfitLoss = 0;
      const tradeAnalysis = await getAllTradeAnalysis(trade._id);

      tradeAnalysis.exitAnalyses.forEach((exitAnalysis) => {
        totalProfitLoss +=
          exitAnalysis.profitClosedPosition + exitAnalysis.lossClosedPosition;
      });

      if (totalProfitLoss > 0) {
        equityFeatures.ProfitCount += 1;
      } else {
        equityFeatures.LossCount += 1;
      }
    } else if (market === 'equityoptions') {
      equityOptions.count += 1;
      let totalProfitLoss = 0;
      const tradeAnalysis = await getAllTradeAnalysis(trade._id);

      tradeAnalysis.exitAnalyses.forEach((exitAnalysis) => {
        totalProfitLoss +=
          exitAnalysis.profitClosedPosition + exitAnalysis.lossClosedPosition;
      });

      if (totalProfitLoss > 0) {
        equityOptions.ProfitCount += 1;
      } else {
        equityOptions.LossCount += 1;
      }
    } else if (market === 'commodity') {
      commodityOptions.count += 1;
      let totalProfitLoss = 0;
      const tradeAnalysis = await getAllTradeAnalysis(trade._id);

      tradeAnalysis.data.exitAnalyses.forEach((exitAnalysis) => {
        totalProfitLoss +=
          exitAnalysis.profitClosedPosition + exitAnalysis.lossClosedPosition;
      });

      if (totalProfitLoss > 0) {
        commodityOptions.ProfitCount += 1;
      } else {
        commodityOptions.LossCount += 1;
      }
    } else if (market === 'commodityfutures') {
      commodityFutures.count += 1;
      let totalProfitLoss = 0;
      const tradeAnalysis = await getAllTradeAnalysis(trade._id);

      tradeAnalysis.exitAnalyses.forEach((exitAnalysis) => {
        totalProfitLoss +=
          exitAnalysis.profitClosedPosition + exitAnalysis.lossClosedPosition;
      });

      if (totalProfitLoss > 0) {
        commodityFutures.ProfitCount += 1;
      } else {
        commodityFutures.LossCount += 1;
      }
    }
  }

  return [
    { equity: equity },
    { equityFeatures: equityFeatures },
    { equityOptions: equityOptions },
    { commodityOptions: commodityOptions },
    { commodityFutures: commodityFutures }
  ];
}

export const profitAndLossGraph = async (body) => {
  const trades = await getAllTradeOfUser(body);

  const currentDate = new Date();
  const tradeDuration = 200;
  const filteredTrade = getLatestTrades(trades, currentDate, tradeDuration);

  const profitAndLossOfTrades = await getTradeProfitAndLossOnMarketBased(
    filteredTrade
  );

  return {
    code: HttpStatus.OK,
    data: profitAndLossOfTrades,
    message: 'Fetched Profit and Loss of trades for the latest 200 days'
  };
};

async function getTradeProfitAndLossOnMarketBased(trades) {
  let equity = {
    totalProfit: 0,
    totalLoss: 0,
    amountProfit: 0,
    amountLoss: 0
  };
  let equityFeatures = {
    totalProfit: 0,
    totalLoss: 0,
    amountProfit: 0,
    amountLoss: 0
  };
  let equityOptions = {
    totalProfit: 0,
    totalLoss: 0,
    amountProfit: 0,
    amountLoss: 0
  };
  let commodityOptions = {
    totalProfit: 0,
    totalLoss: 0,
    amountProfit: 0,
    amountLoss: 0
  };
  let commodityFutures = {
    totalProfit: 0,
    totalLoss: 0,
    amountProfit: 0,
    amountLoss: 0
  };

  for (const trade of trades) {
    const market = trade.market.toLowerCase();

    const tradeAnalysis = await getAllTradeAnalysis(trade._id);

    const exitTrade = await exitModel.findById(trade.exit);

    let totalProfitLoss = 0;
    let totalAmountProfit = 0;
    let totalAmountLoss = 0;
    if (tradeAnalysis.data.exitAnalyses.length > 0) {
      tradeAnalysis.data.exitAnalyses.forEach((exitAnalysis) => {
        totalProfitLoss +=
          exitAnalysis.profitClosedPosition + exitAnalysis.lossClosedPosition;
        if (totalProfitLoss >= 0) {
          totalAmountProfit += totalProfitLoss * exitTrade.quantity;
        } else {
          totalAmountLoss += totalProfitLoss * exitTrade.quantity;
        }
      });
    }

    if (market === 'equity') {
      if (totalProfitLoss > 0) {
        equity.totalProfit += totalProfitLoss;
        equity.amountProfit += totalAmountProfit;
      } else {
        equity.totalLoss += Math.abs(totalProfitLoss);
        equity.amountLoss += totalAmountLoss;
      }
    } else if (market === 'equityfeatures') {
      if (totalProfitLoss > 0) {
        equityFeatures.totalProfit += totalProfitLoss;
        equityFeatures.amountProfit += totalAmountProfit;
      } else {
        equityFeatures.totalLoss += Math.abs(totalProfitLoss);
        equityFeatures.amountLoss += totalAmountLoss;
      }
    } else if (market === 'equityoptions') {
      if (totalProfitLoss > 0) {
        equityOptions.totalProfit += totalProfitLoss;
        equityOptions.amountProfit += totalAmountProfit;
      } else {
        equityOptions.totalLoss += Math.abs(totalProfitLoss);
        equityOptions.amountLoss += totalAmountLoss;
      }
    } else if (market === 'commodity') {
      if (totalProfitLoss > 0) {
        commodityOptions.totalProfit += totalProfitLoss;
        commodityOptions.amountProfit += totalAmountProfit;
      } else {
        commodityOptions.totalLoss += Math.abs(totalProfitLoss);
        commodityOptions.amountLoss += totalAmountLoss;
      }
    } else if (market === 'commodityfutures') {
      if (totalProfitLoss > 0) {
        commodityFutures.totalProfit += totalProfitLoss;
        commodityFutures.amountProfit += totalAmountProfit;
      } else {
        commodityFutures.totalLoss += Math.abs(totalProfitLoss);
        commodityFutures.amountLoss += totalAmountLoss;
      }
    }
  }

  return [
    { equity: equity },
    { equityFeatures: equityFeatures },
    { equityOptions: equityOptions },
    { commodityOptions: commodityOptions },
    { commodityFutures: commodityFutures }
  ];
}
