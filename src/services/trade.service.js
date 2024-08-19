import Trade from '../models/trade.model';
import TradingAccount from '../models/tradingAccount.model';
import GroupTrade from '../models/groupTrade.model';
import HttpStatus from 'http-status-codes';
import mongoose from 'mongoose';
import Exit from '../models/exit.model';
import tradeAnalysisModel from '../models/tradeAnalysis.model';

export const createTrade = async (tradeAccountId, body) => {
  try {
    const newTradeAccountId = mongoose.Types.ObjectId(tradeAccountId);

    // Check if the trading account exists
    const tradingAccountExists = await TradingAccount.findById(
      newTradeAccountId
    );
    if (!tradingAccountExists) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message:
          'Trading Account does not exist. Please provide a valid trading account ID.'
      };
    }
    const { exit, ...tradeDetails } = body;
    const updatedTradeDetail = {
      tradingAccountId: newTradeAccountId,
      ...tradeDetails
    };

    // Create the trade
    const trade = new Trade(updatedTradeDetail);
    await trade.save();

    // Update the trading account to include this trade
    await TradingAccount.findByIdAndUpdate(newTradeAccountId, {
      $push: { trades: trade._id }
    });

    // await trade.save();

    const exitData = await createExit(trade._id, exit);

    console.log('In Created Trade: -', exitData.data._id);

    trade.exit.push(exitData.data._id);
    await trade.save();

    return {
      code: HttpStatus.OK,
      data: trade,
      message: 'Added Manual trade with default exit successfully'
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: `Something went wrong: ${error.message}`
    };
  }
};

export const updateTrade = async (tradeId, body) => {
  try {
    const { exit, ...updatedData } = body;

    if (exit) {
      const { exitId, ...exitBody } = exit;

      if (exitId) {
        const updatedExit = await Exit.findByIdAndUpdate(exitId, exitBody, {
          new: true,
          runValidators: true
        });

        if (!updatedExit) {
          return {
            code: HttpStatus.BAD_REQUEST,
            data: [],
            message: `Please check the exit id or exit body`
          };
        }
      } else {
        await createExit(tradeId, exitBody);
      }
    }

    // Update the trade with new data
    const updatedTrade = await Trade.findByIdAndUpdate(tradeId, updatedData, {
      new: true, // Return the updated document
      runValidators: true // Ensure validation is applied
    });

    if (!updatedTrade) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: `Please check the trade id or trade body`
      };
    }

    return {
      code: HttpStatus.OK,
      data: updatedTrade,
      message: 'Trade Updated Successfull!'
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: `Something went wrong :- ${error.message}`
    };
  }
};

export const getAllTrade = async (tradingAccountId, body) => {
  try {
    const tradingAccount = await TradingAccount.findById(
      tradingAccountId
    ).populate({
      path: 'trades',
      populate: {
        path: 'exit', // This populates the exit field within trades
        model: 'Exit' // Name of the model to populate
      }
    });

    if (!tradingAccount) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'No trading account exists with this ID'
      };
    }

    return {
      code: HttpStatus.OK,
      data: tradingAccount.trades,
      message: 'All trades fetched successfully'
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
    };
  }
};

export const getAllTradeOfUser = async (body) => {
  try {
    // Use findOne to search by userId

    const tradingAccount = await TradingAccount.find({
      userId: body.userId
    }).populate({
      path: 'trades',
      populate: {
        path: 'exit',
        model: 'Exit'
      }
    });

    var allTradesOfUser = [];
    tradingAccount.map((account) => {
      account.trades.map((trade) => {
        allTradesOfUser.push(trade);
      });
    });
    if (!tradingAccount) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'No trading account exists with this ID'
      };
    }

    return {
      code: HttpStatus.OK,
      data: allTradesOfUser,
      message: 'All trades fetched successfully'
    };
  } catch (error) {
    console.error('Error fetching trading account:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
    };
  }
};

export const groupTrade = async (body) => {
  try {
    const {
      userId,
      groupName,
      market,
      account,
      broker,
      assessment,
      strategy,
      instrument,
      tradeType,
      quantity,
      price,
      trades
    } = body;

    // Create a new GroupTrade object
    const newGroupTrade = new GroupTrade({
      userId,
      groupName,
      market,
      account,
      broker,
      assessment,
      strategy,
      instrument,
      tradeType,
      quantity,
      price,
      trades
    });

    await newGroupTrade.save();

    // Update each trade with the groupTrade reference
    await Trade.updateMany(
      { _id: { $in: trades } },
      { $set: { groupTrade: newGroupTrade._id } }
    );

    return {
      code: HttpStatus.CREATED,
      data: newGroupTrade,
      message: 'Group trade created successfully'
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something else went wrong'
    };
  }
};

// Service function to create exit data
export const createExit = async (tradeId, body) => {
  try {
    // Find the trade by its ID
    const trade = await Trade.findById(tradeId);

    if (!trade) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'Trade not found'
      };
    }

    // Calculate the total quantity of existing exits
    const existingExits = await Exit.find({ tradeId });
    const totalExitQuantity = existingExits.reduce(
      (sum, exit) => sum + exit.quantity,
      0
    );

    // Check if adding the new exit would exceed the trade's quantity
    if (totalExitQuantity + body.quantity > trade.tradeQuantity) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'Total exit quantity exceeds trade quantity'
      };
    }

    // Create the new exit
    const exit = new Exit({
      tradingAccountId: trade.tradingAccountId,
      tradeId,
      ...body
    });
    await exit.save();

    // Calculate trade analysis for the new exit
    const position =
      trade.tradeQuantity > totalExitQuantity + body.quantity
        ? 'Open'
        : 'Close';
    const resultClosedPosition =
      position === 'Close'
        ? (body.price - trade.price) * body.quantity < 0
          ? 'Loss'
          : 'Profit'
        : null;
    const profitClosedPosition =
      resultClosedPosition === 'Profit'
        ? (body.price - trade.price) * body.quantity
        : 0;
    const lossClosedPosition =
      resultClosedPosition === 'Loss'
        ? (body.price - trade.price) * body.quantity
        : 0;
    const profitAndLossOpenPosition =
      position === 'Open' ? (body.price - trade.price) * body.quantity : 0;

    const tradeDuration =
      position === 'Close'
        ? (new Date(body.exitDate) - new Date(trade.entryDate)) /
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
        : body.quantity * body.price;
    const roi =
      position === 'Open'
        ? (profitAndLossOpenPosition * 100) / investment
        : (profitClosedPosition * 100) / investment;

    // Create and save the TradeAnalysis
    const tradeAnalysis = new tradeAnalysisModel({
      tradeId: trade._id,
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
    });
    await tradeAnalysis.save();

    // Update the exit document to include the tradeAnalysis reference
    exit.tradeAnalysis.push(tradeAnalysis._id);
    await exit.save();

    // console.log('In exit trade :- ', trade);

    // // Update the trade to include this exit
    trade.exit.push(exit._id);
    // await trade.save();
    return {
      code: HttpStatus.OK,
      data: exit,
      message:
        'Exit created, trade analysis calculated, and trade updated successfully'
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: `Something went wrong: ${error.message}`
    };
  }
};

export const getAllTradeGroup = async (body) => {
  try {
    const groupTrades = await GroupTrade.find({
      userId: body.userId
    }).populate({
      path: 'trades',
      populate: {
        path: 'exit',
        model: 'Exit'
      }
    });

    return {
      code: HttpStatus.OK,
      data: groupTrades,
      message: 'All group trades fetched successfully'
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
    };
  }
};

export const updateGroupTrade = async (groupId, tradeId) => {
  try {
    const groupTrade = await GroupTrade.findById(groupId);

    if (groupTrade == null) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'Not A valid Trade Id'
      };
    }
    groupTrade.trades.push(tradeId);

    // Update the group trade in the database
    await GroupTrade.updateOne({ _id: groupId }, { trades: groupTrade.trades });

    // Return a success response
    return {
      code: HttpStatus.OK,
      data: groupTrade,
      message: 'Trade updated successfully'
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: error
    };
  }
};
