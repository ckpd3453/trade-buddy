import Trade from '../models/trade.model';
import Exit from '../models/exit.model';
import TradeAnalysis from '../models/tradeAnalysis.model';
import HttpStatus from 'http-status-codes';

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
