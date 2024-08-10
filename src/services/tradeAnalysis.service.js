import exitModel from '../models/exit.model';
import tradeModel from '../models/trade.model';
import HttpStatus from 'http-status-codes';

export const getAllTradeAnalysis = async (tradeId) => {
  try {
    // Fetch the trade document
    const trade = await tradeModel.findById(tradeId);

    if (!trade) {
      return {
        code: HttpStatus.NOT_FOUND,
        message: 'Trade not found'
      };
    }

    // Initialize cumulative values
    let cumulativeExitQuantity = 0;
    let overallAnalysis = null;
    let exitAnalyses = [];

    // Analyze each exit
    const analysisPromises = trade.exit.map(async (exitObj) => {
      try {
        const exit = await exitModel.findById(exitObj);

        if (!exit) {
          return {
            error: `Exit with ID ${exitObj} not found`
          };
        }

        const position =
          trade.tradeQuantity > exit.quantity + cumulativeExitQuantity
            ? 'Open'
            : 'Close';
        const resultClosedPosition =
          position === 'Close'
            ? (exit.price - trade.price) * exit.quantity < 0
              ? 'Loss'
              : 'Profit'
            : null;
        const profitClosedPosition =
          resultClosedPosition === 'Profit'
            ? (exit.price - trade.price) * exit.quantity
            : null;
        const lossClosedPosition =
          resultClosedPosition === 'Loss'
            ? (exit.price - trade.price) * exit.quantity
            : null;
        const profitAndLossOpenPosition =
          position === 'Open'
            ? (exit.price - trade.price) * exit.quantity
            : null;

        cumulativeExitQuantity += exit.quantity; // Update cumulative quantity

        const tradeDuration =
          position === 'Close'
            ? (new Date(exit.exitDate) - new Date(trade.entryDate)) /
              (1000 * 60 * 60 * 24)
            : null;
        const tradeStrategy =
          tradeDuration > 10 || tradeDuration === null
            ? 'Investment'
            : tradeDuration <= 0
            ? 'Intraday'
            : 'Swing';
        const investment =
          trade.tradeType === 'Buy'
            ? trade.tradeQuantity * trade.price
            : exit.quantity * exit.price;
        const roi =
          position === 'Open'
            ? (profitAndLossOpenPosition * 100) / investment
            : (profitClosedPosition * 100) / investment;

        const analysis = {
          tradeId: tradeId,
          exitId: exit._id,
          position: position,
          resultClosedPosition: resultClosedPosition,
          profitClosedPosition: profitClosedPosition,
          lossClosedPosition: lossClosedPosition,
          profitAndLossOpenPosition: profitAndLossOpenPosition,
          tradeDuration: tradeDuration,
          tradeStrategy: tradeStrategy,
          investment: investment,
          roi: roi
        };

        exitAnalyses.push(analysis); // Collect the analysis for this exit

        return analysis;
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
