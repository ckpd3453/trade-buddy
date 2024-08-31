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

    let newTrade;
    // Handle both single exit object and array of exit objects
    if (exit) {
      if (Array.isArray(exit)) {
        // If exit is an array, iterate and create each exit
        const exitData = await createExit(trade._id, exit);
        newTrade = exitData.data;
        if (exitData.code !== HttpStatus.OK) {
          return exitData; // Return if any exit creation fails
        }
      } else {
        const exitData = await createExit(trade._id, exit);
        newTrade = exitData.data;
        if (exitData.code !== HttpStatus.OK) {
          return exitData; // Return if exit creation fails
        }
      }
    } else {
      // Save the trade with the exits linked
      newTrade = await trade.save();
    }

    return {
      code: HttpStatus.OK,
      data: newTrade,
      message: 'Added Manual trade with exit(s) successfully'
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
      if (Array.isArray(exit)) {
        // If exit is an array, iterate through each exit object
        for (const exitItem of exit) {
          const { _id, ...exitBody } = exitItem;
          const exitId = _id;
          if (exitId) {
            // Update existing exit
            const updatedExit = await updateExit(tradeId, exitId, exitBody);

            updatedData.openQuantity = updatedExit.data.openQuantity;
            updatedData.profitClosed = updatedExit.data.profitClosed;
            updatedData.profitOpen = updatedExit.data.profitOpen;
            if (!updatedExit.code == 200) {
              return {
                code: HttpStatus.BAD_REQUEST,
                data: [],
                message: updatedExit.message
              };
            }
          } else {
            // Create a new exit
            const exitedTrade = await createExit(tradeId, exitBody);
            if (exitedTrade.code !== HttpStatus.OK) {
              return exitedTrade; // Return the error if exit creation failed
            }
            updatedData.openQuantity = exitedTrade.data.openQuantity;
            updatedData.profitClosed = exitedTrade.data.profitClosed;
            updatedData.profitOpen = exitedTrade.data.profitOpen;
          }
        }
      } else {
        // Handle a single exit object
        const { exitId, ...exitBody } = exit;

        if (exitId) {
          // Update existing exit
          const updatedExit = await updateExit(tradeId, exitId, exitBody);
          if (!updatedExit.code == 200) {
            return {
              code: HttpStatus.BAD_REQUEST,
              data: [],
              message: updatedExit.message
            };
          }
        } else {
          // Create a new exit
          const exitedTrade = await createExit(tradeId, exitBody);
          if (exitedTrade.code !== HttpStatus.OK) {
            return exitedTrade; // Return the error if exit creation failed
          }
          updatedData.openQuantity = exitedTrade.data.openQuantity;
          updatedData.profitClosed = exitedTrade.data.profitClosed;
          updatedData.profitOpen = exitedTrade.data.profitOpen;
        }
      }
    }

    // Update the Trade with new data
    const updatedTrade = await Trade.findByIdAndUpdate(tradeId, updatedData, {
      new: true, // Return the updated document
      runValidators: true // Ensure validation is applied
    }).populate({
      path: 'exit', // This populates the exit field within trades
      model: 'Exit' // Name of the model to populate
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

const updateExit = async (tradeId, exitId, exitBody) => {
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
    const totalExitQuantity = await Exit.aggregate([
      { $match: { tradeId: mongoose.Types.ObjectId(tradeId) } },
      { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
    ]);

    // Get the current total exit quantity
    const currentTotalExitQuantity =
      totalExitQuantity.length > 0 ? totalExitQuantity[0].totalQuantity : 0;

    // Get the existing exit quantity if updating
    const existingExit = exitId ? await Exit.findById(exitId) : null;
    const existingExitQuantity = existingExit ? existingExit.quantity : 0;

    // Calculate new total quantity after this exit
    const newTotalExitQuantity =
      currentTotalExitQuantity - existingExitQuantity + exitBody.quantity;

    // Check if the new exit quantity exceeds trade's entry quantity
    if (newTotalExitQuantity > trade.entryQuantity) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'Total exit quantity exceeds trade quantity'
      };
    }

    // Define whether it's an update or create operation
    let exit;
    if (exitId) {
      // Update existing exit
      exit = await Exit.findByIdAndUpdate(exitId, exitBody, {
        new: true,
        runValidators: true
      });

      if (!exit) {
        return {
          code: HttpStatus.BAD_REQUEST,
          data: [],
          message: `Please check the exit id or exit body`
        };
      }
    } else {
      // Create a new exit
      exit = new Exit({ tradeId, ...exitBody });
      await exit.save();
    }

    // Calculate trade analysis for the exit
    const position =
      trade.entryQuantity > newTotalExitQuantity ? 'Open' : 'Close';
    const profitLoss = (exitBody.price - trade.entryPrice) * exitBody.quantity;
    const resultClosedPosition =
      position === 'Close' ? (profitLoss < 0 ? 'Loss' : 'Profit') : null;
    const profitClosedPosition =
      resultClosedPosition === 'Profit' ? profitLoss : 0;
    const lossClosedPosition = resultClosedPosition === 'Loss' ? profitLoss : 0;
    const profitAndLossOpenPosition = position === 'Open' ? profitLoss : 0;

    const tradeDuration =
      position === 'Close'
        ? (new Date(exitBody.exitDate) - new Date(trade.entryDate)) /
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
        : exitBody.quantity * exitBody.price;
    const roi =
      position === 'Open'
        ? (profitAndLossOpenPosition * 100) / investment
        : (profitClosedPosition * 100) / investment;

    // Update or create TradeAnalysis
    let tradeAnalysis;
    if (exitId) {
      tradeAnalysis = await tradeAnalysisModel.findOneAndUpdate(
        { exitId: exit._id },
        {
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
        },
        { new: true, upsert: true, runValidators: true }
      );
    } else {
      tradeAnalysis = new tradeAnalysisModel({
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
    }

    // Update the exit document to include the tradeAnalysis reference
    if (!exit.tradeAnalysis.includes(tradeAnalysis._id)) {
      exit.tradeAnalysis.push(tradeAnalysis._id);
    }
    await exit.save();

    // Update the trade with the new exit and profit/loss values
    if (!trade.exit.includes(exit._id)) {
      trade.exit.push(exit._id);
    }
    trade.profitClosed = (trade.profitClosed || 0) + profitClosedPosition;
    trade.profitOpen = (trade.profitOpen || 0) + profitAndLossOpenPosition;
    trade.tradeStatus = position;
    trade.openQuantity = trade.entryQuantity - newTotalExitQuantity;

    await trade.save();
    return {
      code: HttpStatus.OK,
      data: trade,
      message:
        'Exit created or updated, trade analysis calculated, and trade updated successfully'
    };
  } catch (error) {
    console.error('Error in updateExit:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: `Something went wrong: ${error.message}`
    };
  }
};

export const getAllTradeByBrokerAccount = async (tradingAccountId) => {
  try {
    const trades = await Trade.find({
      brokerAccountId: tradingAccountId
    }).populate({
      path: 'exit', // This populates the exit field within trades
      model: 'Exit' // Name of the model to populate
    });

    if (!trades) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'No trading account exists with this ID'
      };
    }

    const existingTrade = trades.filter((trade) => trade.isDeleted === false);

    return {
      code: HttpStatus.OK,
      data: existingTrade,
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

    // Handle both single exit object and array of exit objects
    const exits = Array.isArray(body) ? body : [body];

    const newExitQuantity = exits.reduce((sum, exitBody) => {
      return sum.quantity + exitBody.quantity;
    });

    let accumulatedExitQuantity = totalExitQuantity;

    // Check if adding this exit would exceed the trade's quantity
    if (accumulatedExitQuantity + newExitQuantity > trade.entryQuantity) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'Total exit quantity exceeds trade quantity'
      };
    }
    for (const exitBody of exits) {
      accumulatedExitQuantity += exitBody.quantity;

      // Create the new exit
      const exit = new Exit({
        tradeId,
        ...exitBody
      });

      // Calculate trade analysis for the new exit
      const position =
        trade.entryQuantity > accumulatedExitQuantity ? 'Open' : 'Close';
      const resultClosedPosition =
        position === 'Close'
          ? (exitBody.price - trade.entryPrice) * exitBody.quantity < 0
            ? 'Loss'
            : 'Profit'
          : null;
      const profitClosedPosition =
        resultClosedPosition === 'Profit'
          ? (exitBody.price - trade.entryPrice) * exitBody.quantity
          : 0;
      const lossClosedPosition =
        resultClosedPosition === 'Loss'
          ? (exitBody.price - trade.entryPrice) * exitBody.quantity
          : 0;
      const profitAndLossOpenPosition =
        position === 'Open'
          ? (exitBody.price - trade.entryPrice) * exitBody.quantity
          : 0;

      const tradeDuration =
        position === 'Close'
          ? (new Date(exitBody.exitDate) - new Date(trade.entryDate)) /
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
          : exitBody.quantity * exitBody.price;
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

      // Save the exit
      await exit.save();

      // Update the trade to include this exit
      trade.exit.push(exit._id);

      // Update trade's profitClosed and profitOpen
      trade.profitClosed = (trade.profitClosed || 0) + profitClosedPosition;
      trade.profitOpen = (trade.profitOpen || 0) + profitAndLossOpenPosition;

      // Update trade's status and openQuantity
      trade.tradeStatus = position;
      trade.openQuantity = trade.entryQuantity - accumulatedExitQuantity;
    }

    await trade.save();
    return {
      code: HttpStatus.OK,
      data: trade,
      message:
        'Exit(s) created, trade analysis calculated, and trade updated successfully'
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
