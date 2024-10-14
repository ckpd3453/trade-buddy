import Trade from '../models/trade.model';
import TradeAnalysis from '../models/tradeAnalysis.model';
import HttpStatus from 'http-status-codes';
import { getAllTradeOfUser } from './trade.service';
import moment from 'moment';
import tradeAnalysisModel from '../models/tradeAnalysis.model';

// Main function to get Profit and Loss graph data
export const profitAndLossGraph = async (body) => {
  const trades = await getAllTradeOfUser(body);
  console.log(trades);

  const currentDate = new Date();
  const tradeDuration = body.duration;

  let filteredTradesByInstruments;

  if (body.instruments.length > 0) {
    filteredTradesByInstruments = filterTradesByInstrument(
      trades.data,
      body.instruments
    );
  } else {
    filteredTradesByInstruments = trades.data;
  }

  // Filter trades based on the duration object (daily, weekly, monthly, yearly)
  const filteredTrades = filterTradesByDuration(
    filteredTradesByInstruments,
    currentDate,
    tradeDuration
  );

  // Get the profit and loss of trades on instrument basis by date
  const profitAndLossOfTrades = body.roi
    ? await getTradeRoi(filteredTrades)
    : body.type === 'tradeStrategy'
    ? await getTradeProfitAndLossOnTradeDuration(filteredTrades)
    : await getTradeProfitAndLossOnInstrumentBasedByDate(filteredTrades);
  console.log(profitAndLossOfTrades[0].instruments[0], '[[[[[[[[[[[[[[[[[[[[');

  // Initialize profit and loss tracking for each instrument
  let cashEquity = { count: 0, win: 0, loss: 0 };
  let forexOptions = { count: 0, win: 0, loss: 0 };
  let forexFutures = { count: 0, win: 0, loss: 0 };
  let cryptoFutures = { count: 0, win: 0, loss: 0 };
  let cryptoOptions = { count: 0, win: 0, loss: 0 };
  let commodityFutures = { count: 0, win: 0, loss: 0 };
  let commodityOptions = { count: 0, win: 0, loss: 0 };
  let indexEquityFutures = { count: 0, win: 0, loss: 0 };
  let indexEquityOptions = { count: 0, win: 0, loss: 0 };

  // Accumulate totals for profit/loss per trade
  !body.roi &&
    profitAndLossOfTrades.forEach((dayTrade) => {
      let totalProfitSumEachDay = 0;
      let totalLossSumEachDay = 0;
      let totalTradeCount = 0;
      let totalProfitCount = 0;
      let totalLossCount = 0;

      dayTrade.instruments.forEach((trade) => {
        const tradeName = trade.name.toLowerCase();

        // Accumulate daily profit/loss
        totalProfitSumEachDay += trade.totalProfit || 0; // Guard against undefined
        totalLossSumEachDay += trade.totalLoss || 0; // Guard against undefined
        totalTradeCount += trade.count || 0;
        totalProfitCount += trade.ProfitCount || 0;
        totalLossCount += trade.LossCount || 0;

        // Map the trade names and accumulate results accordingly
        switch (tradeName) {
          case 'cash/equity':
            cashEquity.count += trade.count;
            cashEquity.win += trade.ProfitCount;
            cashEquity.loss += trade.LossCount;
            break;
          case 'forex options':
            forexOptions.count += trade.count;
            forexOptions.win += trade.ProfitCount;
            forexOptions.loss += trade.LossCount;
            break;
          case 'forex futures':
            forexFutures.count += trade.count;
            forexFutures.win += trade.ProfitCount;
            forexFutures.loss += trade.LossCount;
            break;
          case 'crypto futures':
            cryptoFutures.count += trade.count;
            cryptoFutures.win += trade.ProfitCount;
            cryptoFutures.loss += trade.LossCount;
            break;
          case 'crypto options':
            cryptoOptions.count += trade.count;
            cryptoOptions.win += trade.ProfitCount;
            cryptoOptions.loss += trade.LossCount;
            break;
          case 'commodity futures':
            commodityFutures.count += trade.count;
            commodityFutures.win += trade.ProfitCount;
            commodityFutures.loss += trade.LossCount;
            break;
          case 'commodity options':
            commodityOptions.count += trade.count;
            commodityOptions.win += trade.ProfitCount;
            commodityOptions.loss += trade.LossCount;
            break;
          case 'index/equity futures':
            indexEquityFutures.count += trade.count;
            indexEquityFutures.win += trade.ProfitCount;
            indexEquityFutures.loss += trade.LossCount;
            break;
          case 'index/equity options':
            indexEquityOptions.count += trade.count;
            indexEquityOptions.win += trade.ProfitCount;
            indexEquityOptions.loss += trade.LossCount;
            break;
          default:
            console.warn(`Unknown instrument: ${trade.name}`);
        }
      });

      // Attach total profit, loss, and trade counts for the day
      dayTrade.total = {
        totalProfit: totalProfitSumEachDay,
        totalLoss: totalLossSumEachDay
      };
      dayTrade.totalTradeCount = totalTradeCount;
      dayTrade.Win = totalProfitCount;
      dayTrade.Loss = totalLossCount;
      dayTrade.WinRatio = (totalProfitCount / totalTradeCount) * 100 || 0; // Avoid division by zero
    });

  const accumulateWeeklyPnl = (profitAndLossOfTrades) => {
    const weeklyPnl = {};
    const totalWeeks = 4; // Assuming you're tracking 4 weeks for the current month

    // Initialize all weeks with default values (0 for each field)
    for (let week = 1; week <= totalWeeks; week++) {
      weeklyPnl[`week-${week}`] = body.roi
        ? { totalTradeCount: 0, roi: 0 }
        : {
            totalProfit: 0,
            totalLoss: 0,
            totalTradeCount: 0,
            Win: 0,
            Loss: 0,
            averageWin: 0,
            averageLoss: 0
          };
    }

    // Helper function to calculate the week number based on the date
    const getWeekNumber = (tradeDate) => {
      const date = new Date(tradeDate);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1); // Start of the month
      const diffInDays = Math.floor(
        (date - startOfMonth) / (1000 * 60 * 60 * 24)
      ); // Days since the start of the month
      return Math.ceil((diffInDays + 1) / 7); // Calculate week number (1-indexed)
    };

    // Loop through trades and accumulate them based on the week number
    profitAndLossOfTrades.forEach((trade) => {
      const weekNumber = getWeekNumber(trade.date); // Get the week number based on the trade date

      // Ensure weekNumber is valid (between 1 and totalWeeks)
      if (weekNumber <= totalWeeks) {
        if (body.roi) {
          weeklyPnl[`week-${weekNumber}`].totalTradeCount +=
            trade.totalTradeCount || 0;

          // Check if roi_percentage is valid and default to 0 if it's null or undefined
          weeklyPnl[`week-${weekNumber}`].roi +=
            trade.instruments[0].roi_percentage != null
              ? trade.instruments[0].roi_percentage
              : 0;
        } else {
          weeklyPnl[`week-${weekNumber}`].totalProfit +=
            trade.total.totalProfit || 0;
          weeklyPnl[`week-${weekNumber}`].totalLoss +=
            trade.total.totalLoss || 0;
          weeklyPnl[`week-${weekNumber}`].totalTradeCount +=
            trade.totalTradeCount || 0;
          weeklyPnl[`week-${weekNumber}`].Win += trade.Win || 0;
          weeklyPnl[`week-${weekNumber}`].Loss += trade.Loss || 0;
          weeklyPnl[`week-${weekNumber}`].averageWin =
            weeklyPnl[`week-${weekNumber}`].Win /
            weeklyPnl[`week-${weekNumber}`].totalTradeCount;
          weeklyPnl[`week-${weekNumber}`].averageLoss =
            weeklyPnl[`week-${weekNumber}`].Loss /
            weeklyPnl[`week-${weekNumber}`].totalTradeCount;
        }
      }
    });

    return weeklyPnl;
  };

  // Determine the period and generate the response accordingly
  let result;
  if (tradeDuration.period.toLowerCase() === 'weekly') {
    // Accumulate P&L weekly-wise
    result = {
      weeklyPnl: accumulateWeeklyPnl(profitAndLossOfTrades),
      instrumentSummaries: !body.roi && {
        cashEquity,
        forexOptions,
        forexFutures,
        cryptoFutures,
        cryptoOptions,
        commodityFutures,
        commodityOptions,
        indexEquityFutures,
        indexEquityOptions
      }
    };
  } else {
    // Default to daily-wise P&L
    result = {
      dailyPnl: profitAndLossOfTrades,
      instrumentSummaries: body.roi
        ? null
        : {
            cashEquity,
            forexOptions,
            forexFutures,
            cryptoFutures,
            cryptoOptions,
            commodityFutures,
            commodityOptions,
            indexEquityFutures,
            indexEquityOptions
          }
    };
  }

  return {
    code: HttpStatus.OK,
    data: result,
    message: `Fetched Profit and Loss of trades for the latest ${
      tradeDuration.period === 'weekly' ? 'weeks' : 'days'
    }`
  };
};

// Filter trades by duration based on tradeDuration object
function filterTradesByDuration(trades, currentDate, tradeDuration) {
  let filteredTrades = [];

  // Handle yearly trades
  if (tradeDuration.year !== null) {
    const givenYear = tradeDuration.year;
    filteredTrades = filterTradesByYearly(trades, givenYear);
  } else {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    // If no year is provided, return all trades
    filteredTrades = filterTradesByYearly(trades, currentYear);
  }

  // Handle monthly trades
  if (tradeDuration.month != null) {
    const givenMonth = tradeDuration.month;
    filteredTrades = filterTradesByMonthly(filteredTrades, givenMonth);
  } else {
    const currentMonth = currentDate.getMonth() + 1; // Get current month (0-indexed, so +1)
    filteredTrades = filterTradesByMonthly(filteredTrades, currentMonth);
  }

  return filteredTrades;
}

function filterTradesByInstrument(trades, instruments) {
  const filteredTrade = trades.filter((trade) =>
    instruments.includes(trade.instrument.toLowerCase())
  );
  return filteredTrade;
}

// Filter trades by yearly (returns trades from the given year)
function filterTradesByYearly(trades, year) {
  return trades.filter((trade) => {
    const tradeYear = new Date(trade.entryDate).getFullYear();
    return tradeYear === year;
  });
}
// Filter trades by monthly (returns trades from the given month)
function filterTradesByMonthly(trades, month) {
  return trades.filter((trade) => {
    const tradeMonth = new Date(trade.entryDate).getMonth() + 1; // Months are 0-indexed, so +1
    return tradeMonth === month;
  });
}

// Filter trades on daily basis
// function filterTradesByDaily(trades, currentDate) {
//   const today = new Date(currentDate.setHours(0, 0, 0, 0));
//   return trades.filter(
//     (trade) => new Date(trade.entryDate).getTime() === today.getTime()
//   );
// }

// Filter trades on weekly basis (get trades for individual weeks)
// function filterTradesByWeekly(trades, currentDate) {
//   const startOfWeek = new Date(currentDate);
//   startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() || 7));

//   const filteredTrades = [];
//   for (let i = 0; i < 52; i++) {
//     let weekStart = new Date(startOfWeek);
//     weekStart.setDate(weekStart.getDate() - i * 7);
//     let weekEnd = new Date(weekStart);
//     weekEnd.setDate(weekStart.getDate() + 7);

//     const tradesInWeek = trades.filter(
//       (trade) =>
//         new Date(trade.entryDate) >= weekStart &&
//         new Date(trade.entryDate) <= weekEnd
//     );
//     filteredTrades.push(...tradesInWeek);
//   }
//   return filteredTrades;
// }

// // Filter trades on monthly basis
// function filterTradesByMonthly(trades, currentDate) {
//   const currentMonth = currentDate.getMonth();
//   const currentYear = currentDate.getFullYear();
//   const filteredTrades = [];

//   for (let i = 0; i < 12; i++) {
//     const monthStart = new Date(currentYear, currentMonth - i, 1);
//     const monthEnd = new Date(currentYear, currentMonth - i + 1, 0);

//     const tradesInMonth = trades.filter(
//       (trade) =>
//         new Date(trade.entryDate) >= monthStart &&
//         new Date(trade.entryDate) <= monthEnd
//     );
//     filteredTrades.push(...tradesInMonth);
//   }
//   return filteredTrades;
// }

// // Filter trades on yearly basis
// function filterTradesByYearly(trades, currentDate) {
//   const currentYear = currentDate.getFullYear();
//   const filteredTrades = [];

//   for (let i = 0; i < 5; i++) {
//     const yearStart = new Date(currentYear - i, 0, 1);
//     const yearEnd = new Date(currentYear - i, 11, 31);

//     const tradesInYear = trades.filter(
//       (trade) =>
//         new Date(trade.entryDate) >= yearStart &&
//         new Date(trade.entryDate) <= yearEnd
//     );
//     filteredTrades.push(...tradesInYear);
//   }
//   return filteredTrades;
// }

// Get profit and loss on instrument based on date
async function getTradeProfitAndLossOnInstrumentBasedByDate(trades) {
  let profitLossByDate = [];

  for (const trade of trades) {
    const instrument = trade.instrument.toLowerCase();

    const entryDate = moment(trade.entryDate).format('YYYY-MM-DD');

    // Find or create the date object in the array
    let dateObject = profitLossByDate.find((item) => item.date === entryDate);

    if (!dateObject) {
      dateObject = { date: entryDate, instruments: [] };
      console.log(trade.tradeStatus);

      if (trade.tradeStatus === 'Close') {
        profitLossByDate.push(dateObject);
      }
    }

    // Find or create the instrument object in the date
    let instrumentObject = dateObject.instruments.find(
      (item) => item.name === instrument
    );

    if (!instrumentObject) {
      instrumentObject = {
        name: instrument,
        totalProfit: 0,
        totalLoss: 0,
        count: 0,
        ProfitCount: 0,
        LossCount: 0
      };
      dateObject.instruments.push(instrumentObject);
    }

    // Update profit/loss and trade counts

    instrumentObject.totalProfit +=
      trade.profitClosed > 0 ? trade.profitClosed : 0;

    instrumentObject.totalLoss +=
      trade.profitClosed < 0 ? trade.profitClosed : 0;

    instrumentObject.count++;
    if (trade.profitClosed > 0) {
      instrumentObject.ProfitCount++;
    } else {
      instrumentObject.LossCount++;
    }
  }

  return profitLossByDate;
}

async function getTradeProfitAndLossOnTradeDuration(trades) {
  // const tradeAnalysisId =
  //   trades[0].exit[trades[0].exit.length - 1].tradeAnalysis[0];

  // const tradeAnalysis = await tradeAnalysisModel.findById(tradeAnalysisId);
  // console.log('========>>>>>>>', tradeAnalysis, '=========');
  let profitLossByDuration = [];

  for (const trade of trades) {
    const instrument = trade.instrument.toLowerCase();
    const tradeAnalysisId = trade.exit[trade.exit.length - 1].tradeAnalysis[0];

    const tradeAnalysisForDuration = await tradeAnalysisModel.findById(
      tradeAnalysisId
    );
    const tradeDuration = tradeAnalysisForDuration.tradeStrategy;

    // Find or create the date object in the array
    let durationObject = profitLossByDuration.find(
      (item) => item.duration === tradeDuration
    );

    if (!durationObject) {
      durationObject = { duration: tradeDuration, instruments: [] };
      console.log(trade.tradeStatus);

      if (trade.tradeStatus === 'Close') {
        profitLossByDuration.push(durationObject);
      }
    }

    // Find or create the instrument object in the date
    let instrumentObject = durationObject.instruments.find(
      (item) => item.name === instrument
    );

    if (!instrumentObject) {
      instrumentObject = {
        name: instrument,
        totalProfit: 0,
        totalLoss: 0,
        count: 0,
        ProfitCount: 0,
        LossCount: 0
      };
      durationObject.instruments.push(instrumentObject);
    }

    // Update profit/loss and trade counts

    instrumentObject.totalProfit +=
      trade.profitClosed > 0 ? trade.profitClosed : 0;

    instrumentObject.totalLoss +=
      trade.profitClosed < 0 ? trade.profitClosed : 0;

    instrumentObject.count++;
    if (trade.profitClosed > 0) {
      instrumentObject.ProfitCount++;
    } else {
      instrumentObject.LossCount++;
    }
  }

  return profitLossByDuration;
}

async function getTradeRoi(trades) {
  let roiByDate = [];

  for (const trade of trades) {
    const tradeAnalysis = await tradeAnalysisModel.findById(
      trade.exit[0].tradeAnalysis[0]
    );

    const instrument = trade.instrument.toLowerCase();

    const entryDate = moment(trade.entryDate).format('YYYY-MM-DD');

    // Find or create the date object in the array
    let dateObject = roiByDate.find((item) => item.date === entryDate);

    if (!dateObject) {
      dateObject = { date: entryDate, instruments: [] };

      if (trade.tradeStatus === 'Close') {
        roiByDate.push(dateObject);
      }
    }

    // Find or create the instrument object in the date
    let instrumentObject = dateObject.instruments.find(
      (item) => item.name === instrument
    );

    if (!instrumentObject) {
      instrumentObject = {
        name: instrument,
        roi_percentage: 0, // Initialize the `roi` property to 0
        count: 0
      };
      dateObject.instruments.push(instrumentObject);
    }

    // Ensure that `tradeAnalysis.roi` is a valid number before adding
    const roiValue = parseFloat(tradeAnalysis.roi) || 0; // Convert to number and default to 0 if invalid

    // Update profit/loss and trade counts
    instrumentObject.roi_percentage += roiValue; // Add the ROI from tradeAnalysis

    instrumentObject.count++;
  }

  return roiByDate;
}

// export const getProfitAndLossByTradeDuration = () => {

// }
