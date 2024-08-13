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

  let equity = {
    count: 0,
    win: 0,
    loss: 0,
    WinRatio: 0
  };
  let equityFutures = {
    count: 0,
    win: 0,
    loss: 0,
    WinRatio: 0
  };
  let equityOptions = {
    count: 0,
    win: 0,
    loss: 0,
    WinRatio: 0
  };
  let commodityOptions = {
    count: 0,
    win: 0,
    loss: 0,
    WinRatio: 0
  };
  let commodityFutures = {
    count: 0,
    win: 0,
    loss: 0,
    WinRatio: 0
  };
  tradeCountOnMarketBase.map((dayTrade) => {
    let totalTradeCount = 0;
    let totalProfitCount = 0;
    let totalLossCount = 0;
    dayTrade.markets.map((trade) => {
      totalTradeCount += trade.count;
      totalProfitCount += trade.ProfitCount;
      totalLossCount += trade.LossCount;

      // Accumulate totals for each market
      switch (trade.name) {
        case 'equity':
          equity.count += trade.count;
          equity.win += trade.ProfitCount;
          equity.loss += trade.LossCount;
          break;
        case 'equityFutures':
          equityFutures.count += trade.count;
          equityFutures.win += trade.ProfitCount;
          equityFutures.loss += trade.LossCount;
          break;
        case 'equityOptions':
          equityOptions.count += trade.count;
          equityOptions.win += trade.ProfitCount;
          equityOptions.loss += trade.LossCount;
          break;
        case 'commodity':
          commodityOptions.count += trade.count;
          commodityOptions.win += trade.ProfitCount;
          commodityOptions.loss += trade.LossCount;
          break;
        case 'commodityFutures':
          commodityFutures.count += trade.count;
          commodityFutures.win += trade.ProfitCount;
          commodityFutures.loss += trade.LossCount;
          break;
      }
    });

    dayTrade.totalTradeCount = totalTradeCount;
    dayTrade.Win = totalProfitCount;
    dayTrade.Loss = totalLossCount;
    dayTrade.WinRatio = (totalProfitCount / totalTradeCount) * 100;
  });

  // Calculate WinRatio for each market
  equity.WinRatio = (equity.win / equity.count) * 100;
  equityFutures.WinRatio = (equityFutures.win / equityFutures.count) * 100;
  equityOptions.WinRatio = (equityOptions.win / equityOptions.count) * 100;
  commodityOptions.WinRatio =
    (commodityOptions.win / commodityOptions.count) * 100;
  commodityFutures.WinRatio =
    (commodityFutures.win / commodityFutures.count) * 100;

  return {
    code: HttpStatus.OK,
    data: {
      tradeCountOnMarketBase: tradeCountOnMarketBase,
      totalTradeCount: {
        equity: equity,
        equityFutures: equityFutures,
        equityOptions: equityOptions,
        commodityOptions: commodityOptions,
        commodityFutures: commodityFutures
      }
    },
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
  let tradeCountByDateAndMarket = [];

  for (const trade of trades) {
    const market = trade.market.toLowerCase();
    const entryDate = moment(trade.entryDate).format('YYYY-MM-DD');

    // Find the date object in the array
    let dateObject = tradeCountByDateAndMarket.find(
      (item) => item.date === entryDate
    );

    // If the date doesn't exist, create a new object
    if (!dateObject) {
      dateObject = {
        date: entryDate,
        markets: [
          { name: 'equity', count: 0, ProfitCount: 0, LossCount: 0 },
          { name: 'equityFutures', count: 0, ProfitCount: 0, LossCount: 0 },
          { name: 'equityOptions', count: 0, ProfitCount: 0, LossCount: 0 },
          { name: 'commodity', count: 0, ProfitCount: 0, LossCount: 0 },
          { name: 'commodityFutures', count: 0, ProfitCount: 0, LossCount: 0 }
        ]
      };
      tradeCountByDateAndMarket.push(dateObject);
    }

    // Find the market object in the markets array
    const marketData = dateObject.markets.find((item) => item.name === market);

    // Get trade analysis and calculate profit/loss
    const tradeAnalysis = await getAllTradeAnalysis(trade._id);
    let totalProfitLoss = 0;
    if (tradeAnalysis.data.exitAnalyses.length > 0) {
      tradeAnalysis.data.exitAnalyses.forEach((exitAnalysis) => {
        totalProfitLoss +=
          exitAnalysis.profitClosedPosition + exitAnalysis.lossClosedPosition;
      });
    }

    // Update the market data within the date object
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

  let equityPl = {
    profitAmount: 0,
    lossAmount: 0
  };
  let equityFuturesPl = {
    profitAmount: 0,
    lossAmount: 0
  };
  let equityOptionsPl = {
    profitAmount: 0,
    lossAmount: 0
  };
  let commodityOptionsPl = {
    profitAmount: 0,
    lossAmount: 0
  };
  let commodityFuturesPl = {
    profitAmount: 0,
    lossAmount: 0
  };

  profitAndLossOfTrades.map((dayTrade) => {
    console.log(dayTrade);
    let totalProfitSumEachDay = 0;
    let totalLossSumEachDay = 0;
    dayTrade.markets.map((trade) => {
      totalProfitSumEachDay += trade.totalProfit;
      totalLossSumEachDay += trade.totalLoss;
      // Use a switch statement to update individual market variables
      switch (trade.name) {
        case 'equity':
          equityPl.profitAmount += trade.amountProfit;
          equityPl.lossAmount += trade.amountLoss;
          break;
        case 'equityFutures':
          equityFuturesPl.profitAmount += trade.amountProfit;
          equityFuturesPl.lossAmount += trade.amountLoss;
          break;
        case 'equityOptions':
          equityOptionsPl.profitAmount += trade.amountProfit;
          equityOptionsPl.lossAmount += trade.amountLoss;
          break;
        case 'commodity':
          commodityOptionsPl.profitAmount += trade.amountProfit;
          commodityOptionsPl.lossAmount += trade.amountLoss;
          break;
        case 'commodityFutures':
          commodityFuturesPl.profitAmount += trade.amountProfit;
          commodityFuturesPl.lossAmount += trade.amountLoss;
          break;
        default:
          console.warn(`Unknown market: ${trade.name}`);
      }
    });

    dayTrade.total = {
      totalProfit: totalProfitSumEachDay,
      totalLoss: totalLossSumEachDay
    };
  });

  // Add total profit and loss to the result object
  const result = {
    profitAndLossOfTrades,
    marketSummaries: {
      equity: equityPl,
      equityFutures: equityFuturesPl,
      equityOptions: equityOptionsPl,
      commodityOptions: commodityOptionsPl,
      commodityFutures: commodityFuturesPl
    }
  };

  return {
    code: HttpStatus.OK,
    data: result,
    message: 'Fetched Profit and Loss of trades for the latest 200 days'
  };
};

async function getTradeProfitAndLossOnMarketBasedByDate(trades) {
  let profitLossByDate = [];

  for (const trade of trades) {
    const market = trade.market.toLowerCase();
    const entryDate = moment(trade.entryDate).format('YYYY-MM-DD');

    // Find the date object in the array
    let dateObject = profitLossByDate.find((item) => item.date === entryDate);

    // If the date doesn't exist, create a new object
    if (!dateObject) {
      dateObject = {
        date: entryDate,
        markets: [
          {
            name: 'equity',
            totalProfit: 0,
            totalLoss: 0,
            amountProfit: 0,
            amountLoss: 0
          },
          {
            name: 'equityFutures',
            totalProfit: 0,
            totalLoss: 0,
            amountProfit: 0,
            amountLoss: 0
          },
          {
            name: 'equityOptions',
            totalProfit: 0,
            totalLoss: 0,
            amountProfit: 0,
            amountLoss: 0
          },
          {
            name: 'commodity',
            totalProfit: 0,
            totalLoss: 0,
            amountProfit: 0,
            amountLoss: 0
          },
          {
            name: 'commodityFutures',
            totalProfit: 0,
            totalLoss: 0,
            amountProfit: 0,
            amountLoss: 0
          }
        ]
      };
      profitLossByDate.push(dateObject);
    }

    // Find the market object in the markets array
    const marketData = dateObject.markets.find((item) => item.name === market);

    // Get trade analysis and calculate profit/loss
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

    // Update the market data within the date object
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

export const strategyGraph = async (body) => {
  const trades = await getAllTradeOfUser(body);

  const currentDate = new Date();
  const tradeDuration = 200;
  const filteredTrade = getLatestTrades(trades, currentDate, tradeDuration);

  const strategyDataOfUser = await getAllStrategyData(filteredTrade);

  return {
    code: HttpStatus.OK,
    data: strategyDataOfUser,
    message: 'Strategy Date Fetched Successfull.'
  };
};

async function getAllStrategyData(trades) {}
