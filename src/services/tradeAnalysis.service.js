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
  const tradeCountOninstrumentBase = await getTradeCountOnInstrumentBasedByDate(
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
  tradeCountOninstrumentBase.map((dayTrade) => {
    let totalTradeCount = 0;
    let totalProfitCount = 0;
    let totalLossCount = 0;
    dayTrade.instruments.map((trade) => {
      totalTradeCount += trade.count;
      totalProfitCount += trade.ProfitCount;
      totalLossCount += trade.LossCount;

      let tradeName = trade.name.toLowerCase();
      // Accumulate totals for each instrument
      switch (tradeName) {
        case 'equity':
          equity.count += trade.count;
          equity.win += trade.ProfitCount;
          equity.loss += trade.LossCount;
          break;
        case 'equityfutures':
          equityFutures.count += trade.count;
          equityFutures.win += trade.ProfitCount;
          equityFutures.loss += trade.LossCount;
          break;
        case 'equityoptions':
          equityOptions.count += trade.count;
          equityOptions.win += trade.ProfitCount;
          equityOptions.loss += trade.LossCount;
          break;
        case 'commodityoptions':
          commodityOptions.count += trade.count;
          commodityOptions.win += trade.ProfitCount;
          commodityOptions.loss += trade.LossCount;
          break;
        case 'commodityfutures':
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

  // Calculate WinRatio for each instrument
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
      tradeCountOninstrumentBase: tradeCountOninstrumentBase,
      totalTradeCount: {
        equity: equity,
        equityFutures: equityFutures,
        equityOptions: equityOptions,
        commodityOptions: commodityOptions,
        commodityFutures: commodityFutures
      }
    },
    message: 'Trade counts retrieved successfully by date and instrument.'
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

async function getTradeCountOnInstrumentBasedByDate(trades) {
  let tradeCountByDateAndInstrument = [];

  for (const trade of trades) {
    const instrument = trade.instrument.toLowerCase();
    const entryDate = moment(trade.entryDate).format('YYYY-MM-DD');

    // Find the date object in the array
    let dateObject = tradeCountByDateAndInstrument.find(
      (item) => item.date === entryDate
    );

    // If the date doesn't exist, create a new object with dynamic instruments
    if (!dateObject) {
      // Get unique instruments from trades on this date
      const uniqueInstruments = [
        ...new Set(
          trades
            .filter(
              (t) => moment(t.entryDate).format('YYYY-MM-DD') === entryDate
            )
            .map((t) => t.instrument.toLowerCase())
        )
      ];

      // Create the instruments array based on unique instruments
      const instrumentsArray = uniqueInstruments.map((inst) => ({
        name: inst,
        count: 0,
        ProfitCount: 0,
        LossCount: 0
      }));

      dateObject = {
        date: entryDate,
        instruments: instrumentsArray
      };
      tradeCountByDateAndInstrument.push(dateObject);
    }

    // Find the instrument object in the instruments array
    const instrumentData = dateObject.instruments.find(
      (item) => item.name === instrument
    );

    // Get trade analysis and calculate profit/loss
    const tradeAnalysis = await getAllTradeAnalysis(trade._id);
    let totalProfitLoss = 0;
    console.log(tradeAnalysis.data);

    if (tradeAnalysis.data.exitAnalyses.length > 0) {
      tradeAnalysis.data.exitAnalyses.forEach((exitAnalysis) => {
        totalProfitLoss +=
          exitAnalysis.profitClosedPosition +
          exitAnalysis.lossClosedPosition +
          exitAnalysis.profitAndLossOpenPosition;
      });
    }

    // Update the instrument data within the date object
    if (instrumentData) {
      instrumentData.count += 1;
      if (totalProfitLoss > 0) {
        instrumentData.ProfitCount += 1;
      } else {
        instrumentData.LossCount += 1;
      }
    }
  }

  return tradeCountByDateAndInstrument;
}

export const profitAndLossGraph = async (body) => {
  const trades = await getAllTradeOfUser(body);

  const currentDate = new Date();
  const tradeDuration = 200;
  const filteredTrade = getLatestTrades(trades, currentDate, tradeDuration);

  const profitAndLossOfTrades =
    await getTradeProfitAndLossOnInstrumentBasedByDate(filteredTrade);

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
    dayTrade.instruments.map((trade) => {
      totalProfitSumEachDay += trade.totalProfit;
      totalLossSumEachDay += trade.totalLoss;
      // Use a switch statement to update individual instrument variables
      switch (trade.name) {
        case 'equity':
          equityPl.profitAmount += trade.amountProfit;
          equityPl.lossAmount += trade.amountLoss;
          break;
        case 'equityfutures':
          equityFuturesPl.profitAmount += trade.amountProfit;
          equityFuturesPl.lossAmount += trade.amountLoss;
          break;
        case 'equityoptions':
          equityOptionsPl.profitAmount += trade.amountProfit;
          equityOptionsPl.lossAmount += trade.amountLoss;
          break;
        case 'commodityoptions':
          commodityOptionsPl.profitAmount += trade.amountProfit;
          commodityOptionsPl.lossAmount += trade.amountLoss;
          break;
        case 'commodityfutures':
          commodityFuturesPl.profitAmount += trade.amountProfit;
          commodityFuturesPl.lossAmount += trade.amountLoss;
          break;
        default:
          console.warn(`Unknown instrument: ${trade.name}`);
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
    instrumentSummaries: {
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

async function getTradeProfitAndLossOnInstrumentBasedByDate(trades) {
  let profitLossByDate = [];

  for (const trade of trades) {
    const instrument = trade.instrument.toLowerCase();
    const entryDate = moment(trade.entryDate).format('YYYY-MM-DD');

    // Find or create the date object in the array
    let dateObject = profitLossByDate.find((item) => item.date === entryDate);

    if (!dateObject) {
      dateObject = {
        date: entryDate,
        instruments: []
      };
      profitLossByDate.push(dateObject);
    }

    // Find or create the instrument object within the date object
    let instrumentData = dateObject.instruments.find(
      (item) => item.name === instrument
    );

    if (!instrumentData) {
      instrumentData = {
        name: instrument,
        totalProfit: 0,
        totalLoss: 0,
        amountProfit: 0,
        amountLoss: 0
      };
      dateObject.instruments.push(instrumentData);
    }

    // Get trade analysis and calculate profit/loss
    const tradeAnalysis = await getAllTradeAnalysis(trade._id);
    const exitTrade = await exitModel.findById(trade.exit);

    let totalProfitLoss = 0;
    let totalAmountProfit = 0;
    let totalAmountLoss = 0;

    console.log(tradeAnalysis.data.exitAnalyses);

    if (tradeAnalysis.data.exitAnalyses.length > 0) {
      tradeAnalysis.data.exitAnalyses.forEach((exitAnalysis) => {
        const profitLoss =
          exitAnalysis.profitClosedPosition +
          exitAnalysis.lossClosedPosition +
          exitAnalysis.profitAndLossOpenPosition;
        totalProfitLoss += profitLoss;

        if (profitLoss >= 0) {
          totalAmountProfit += profitLoss * exitTrade.quantity;
        } else {
          totalAmountLoss += Math.abs(profitLoss * exitTrade.quantity);
        }
      });
    }

    // Update the instrument data within the date object
    if (totalProfitLoss > 0) {
      instrumentData.totalProfit += totalProfitLoss;
      instrumentData.amountProfit += totalAmountProfit;
    } else {
      instrumentData.totalLoss += Math.abs(totalProfitLoss);
      instrumentData.amountLoss += totalAmountLoss;
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

async function getAllStrategyData(trades) {
  let strategyPerformanceData = [];

  for (const trade of trades) {
    const instrument = trade.instrument.toLowerCase();

    let strategyObject = strategyPerformanceData.find(
      (item) => item.strategy === trade.tradeStrategy
    );

    // If the strategy doesn't exist, create a new object
    if (!strategyObject) {
      strategyObject = {
        strategy: trade.tradeStrategy,
        instruments: [
          {
            name: 'equity',
            amountProfit: 0,
            amountLoss: 0
          },
          {
            name: 'equityfutures',
            amountProfit: 0,
            amountLoss: 0
          },
          {
            name: 'equityoptions',
            amountProfit: 0,
            amountLoss: 0
          },
          {
            name: 'commodityoptions',
            amountProfit: 0,
            amountLoss: 0
          },
          {
            name: 'commodityfutures',
            amountProfit: 0,
            amountLoss: 0
          }
        ],
        count: {
          profit: 0,
          loss: 0
        }
      };
      strategyPerformanceData.push(strategyObject);
    }

    const instrumentData = strategyObject.instruments.find((item) => {
      return item.name === instrument;
    });

    // Get trade analysis and calculate profit/loss
    const tradeAnalysis = await getAllTradeAnalysis(trade._id);
    const exitTrade = await exitModel.findById(trade.exit);

    let totalAmountProfit = 0;
    let totalAmountLoss = 0;

    if (tradeAnalysis.data.exitAnalyses.length > 0) {
      tradeAnalysis.data.exitAnalyses.forEach((exitAnalysis) => {
        const profitLoss =
          exitAnalysis.profitClosedPosition -
          Math.abs(exitAnalysis.lossClosedPosition) +
          exitAnalysis.profitAndLossOpenPosition;

        // Check the result of the closed position and update counts
        if (exitAnalysis.resultClosedPosition === 'Profit') {
          totalAmountProfit += profitLoss * exitTrade.quantity;
          strategyObject.count.profit += 1; // Increment profit count
        } else if (exitAnalysis.resultClosedPosition === 'Loss') {
          totalAmountLoss += Math.abs(profitLoss * exitTrade.quantity);
          strategyObject.count.loss += 1; // Increment loss count
        } else if (exitAnalysis.position === 'Open') {
          if (profitLoss > 0) {
            totalAmountProfit += profitLoss * exitTrade.quantity;
            strategyObject.count.profit += 1;
          } else {
            totalAmountLoss += Math.abs(profitLoss * exitTrade.quantity);
            strategyObject.count.loss += 1;
          }
        }
      });
    }

    // Update the instrument data within the strategy object
    if (instrumentData) {
      instrumentData.amountProfit += totalAmountProfit;
      instrumentData.amountLoss += totalAmountLoss;
    }
  }

  return strategyPerformanceData;
}
