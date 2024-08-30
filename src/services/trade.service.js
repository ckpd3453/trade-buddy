import Trade from '../models/trade.model';
import TradingAccount from '../models/tradingAccount.model';
import GroupTrade from '../models/groupTrade.model';
import HttpStatus from 'http-status-codes';
import mongoose from 'mongoose';
import Exit from '../models/exit.model';
import tradeAnalysisModel from '../models/tradeAnalysis.model';
import User from '../models/user.model';

export const createTrade = async (brokerAccountId, body) => {
  try {
    const newBrokerAccountId = mongoose.Types.ObjectId(brokerAccountId);

    // Check if the trading account exists
    const brokerAccountExists = await TradingAccount.findById(
      newBrokerAccountId
    );
    if (!brokerAccountExists) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message:
          'Trading Account does not exist. Please provide a valid trading account ID.'
      };
    }

    // Extract exit from body and set other trade details
    const { exit, ...tradeDetails } = body;

    // Get the current month and weekday
    const currentDate = new Date();
    const month = currentDate.toLocaleString('default', { month: 'long' }); // e.g., "August"
    const weekday = currentDate.toLocaleString('default', { weekday: 'long' }); // e.g., "Monday"

    // Prepare the trade details including the broker account ID
    const updatedTradeDetail = {
      brokerAccountId: newBrokerAccountId,
      entryTradeMonth: month, // Setting current month
      entryTradeWeek: weekday, // Setting current weekday
      ...tradeDetails
    };

    // Create the trade with the updated trade details
    const trade = new Trade(updatedTradeDetail);
    await trade.save();

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
    console.error('Error creating trade:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: `Something went wrong: ${error.message}`
    };
  }
};

export const updateTrade = async (tradeId, body) => {
  try {
    const { exit, userId, ...updatedData } = body;

    // Handle Exit updates or creation
    if (exit) {
      const { exitId, ...exitBody } = exit;

      if (exitId) {
        // Update existing exit
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
        // Create a new exit
        const exitedTrade = await createExit(tradeId, exitBody);
        if (exitedTrade.code !== HttpStatus.OK) {
          return exitedTrade; // Return the error if exit creation failed
        }
      }
    }

    // Update the Trade with new data
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

    const tradingAccountId = updatedTrade.tradingAccountId;

    // Update TradingAccount if trade was updated successfully
    if (tradingAccountId) {
      const updatedTradingAccount = await TradingAccount.findByIdAndUpdate(
        tradingAccountId,
        { $addToSet: { trades: tradeId } }, // Ensure trade is linked to account
        { new: true, runValidators: true }
      );

      if (!updatedTradingAccount) {
        return {
          code: HttpStatus.BAD_REQUEST,
          data: [],
          message: `TradingAccount update failed`
        };
      }
    }

    // Update User if userId is provided
    if (userId) {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { accountName: tradingAccountId } }, // Ensure account is linked to user
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return {
          code: HttpStatus.BAD_REQUEST,
          data: [],
          message: `User update failed`
        };
      }
    }

    return {
      code: HttpStatus.OK,
      data: updatedTrade,
      message: 'Trade, Exit, TradingAccount, and User updated successfully!'
    };
  } catch (error) {
    console.error('Error in updateTrade:', error); // Enhanced logging for debugging
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: `Something went wrong: ${error.message}`
    };
  }
};

export const getAllTradeByBrokerAccount = async (tradingAccountId) => {
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
    // Find all trades associated with the user's trading account
    const trades = await Trade.find({
      userId: body.userId
    }).populate({
      path: 'exit',
      model: 'Exit' // Populate exit details for each trade
    });

    if (!trades || trades.length === 0) {
      return {
        code: HttpStatus.OK,
        data: [],
        message: 'No trades found for this user.'
      };
    }

    return {
      code: HttpStatus.OK,
      data: trades,
      message: 'All trades fetched successfully'
    };
  } catch (error) {
    console.error('Error fetching trades for user:', error);
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
    if (totalExitQuantity + body.quantity > trade.entryQuantity) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'Total exit quantity exceeds trade quantity'
      };
    }

    // Create the new exit
    const exit = new Exit({
      tradeId,
      ...body
    });

    // Calculate trade analysis for the new exit
    const position =
      trade.entryQuantity > totalExitQuantity + body.quantity
        ? 'Open'
        : 'Close';
    const resultClosedPosition =
      position === 'Close'
        ? (body.price - trade.entryPrice) * body.quantity < 0
          ? 'Loss'
          : 'Profit'
        : null;
    const profitClosedPosition =
      resultClosedPosition === 'Profit'
        ? (body.price - trade.entryPrice) * body.quantity
        : 0;
    const lossClosedPosition =
      resultClosedPosition === 'Loss'
        ? (body.price - trade.entryPrice) * body.quantity
        : 0;
    const profitAndLossOpenPosition =
      position === 'Open' ? (body.price - trade.entryPrice) * body.quantity : 0;

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
        ? trade.entryQuantity * trade.entryPrice
        : body.quantity * body.price;
    const roi =
      position === 'Open'
        ? (profitAndLossOpenPosition * 100) / investment
        : (profitClosedPosition * 100) / investment;

    // Create and save the TradeAnalysis
    const tradeAnalysis = new tradeAnalysisModel({
      tradeId: trade._id,
      exitId: exit._id,
      position,
      resultClosedPosition,
      profitClosedPosition,
      lossClosedPosition,
      profitAndLossOpenPosition,
      tradeDuration,
      tradeStrategy,
      investment,
      roi
    });

    await tradeAnalysis.save();

    // Update the exit document to include the tradeAnalysis reference
    exit.tradeAnalysis.push(tradeAnalysis._id);

    // Update the trade to include this exit
    trade.exit.push(exit._id);
    await trade.save();

    await exit.save();

    return {
      code: HttpStatus.OK,
      data: exit,
      message:
        'Exit created, trade analysis calculated, and trade updated successfully'
    };
  } catch (error) {
    console.error('Error creating exit:', error);
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
