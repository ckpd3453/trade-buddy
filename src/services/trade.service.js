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
      trade.openQuantity == 0 &&
        (trade.openQuantity = trade.entryQuantity) &&
        (trade.profitOpen =
          (trade.cmp - trade.entryPrice) * trade.openQuantity);

      newTrade = await trade.save();
    }

    return {
      code: HttpStatus.OK,
      data: newTrade,
      message: 'Added Manual trade successfully'
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

export const deleteTrade = async (tradeId) => {
  try {
    // Update the trade to mark it as deleted
    const updatedTrade = await Trade.findByIdAndUpdate(
      tradeId,
      { isDeleted: true },
      { new: true, runValidators: true }
    );

    // If the trade is not found, return an error response
    if (!updatedTrade) {
      return {
        code: HttpStatus.NOT_FOUND,
        data: [],
        message: 'Trade not found or already deleted'
      };
    }

    // Return a success response
    return {
      code: HttpStatus.OK,
      data: updatedTrade,
      message: 'Trade marked as deleted successfully'
    };
  } catch (error) {
    console.error('Error in deleteTrade:', error); // Logging for debugging
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

    // Determine if the position is still Open or Closed
    const position =
      trade.entryQuantity > newTotalExitQuantity ? 'Open' : 'Close';

    // P/L calculation based on the updated exit price and open positions
    const profitLoss =
      trade.tradeType === 'Buy'
        ? (exitBody.price - trade.entryPrice) * exitBody.quantity
        : (trade.entryPrice - exitBody.price) * exitBody.quantity;

    // If the position is Closed, calculate the profit/loss at closure
    const resultClosedPosition =
      position === 'Close' ? (profitLoss < 0 ? 'Loss' : 'Profit') : null;
    const profitClosedPosition =
      resultClosedPosition === 'Profit' ? profitLoss : 0;
    const lossClosedPosition = resultClosedPosition === 'Loss' ? profitLoss : 0;
    const profitAndLossClosedPosition = profitLoss;
    // P/L for open positions should be calculated using CMP (Current Market Price)
    const profitAndLossOpenPosition =
      position === 'Open'
        ? trade.tradeType === 'Buy'
          ? (trade.cmp - trade.entryPrice) * trade.openQuantity
          : (trade.entryPrice - trade.cmp) * trade.openQuantity
        : 0;

    // Calculate trade duration only if the position is closed
    const tradeDuration =
      position === 'Close'
        ? (new Date(exitBody.exitDate) - new Date(trade.entryDate)) /
          (1000 * 60 * 60 * 24)
        : null;

    // Trade strategy based on duration (Investment, Swing, or Intraday)
    const tradeStrategy =
      tradeDuration > 10 || tradeDuration === null
        ? 'Investment'
        : tradeDuration <= 0
        ? 'Intraday'
        : 'Swing';

    // Calculate the investment based on trade type
    const investment =
      trade.tradeType === 'Buy'
        ? trade.entryQuantity * trade.entryPrice
        : exitBody.quantity * exitBody.price;

    // ROI calculation for both Open and Closed positions
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

    // Update trade's position status and open quantity
    trade.tradeStatus = position;
    trade.openQuantity = trade.entryQuantity - newTotalExitQuantity;

    let previousProfitAndLossClosedPosition = 0;

    if (existingExit) {
      // Calculate previous profit/loss for the existing exit
      previousProfitAndLossClosedPosition =
        (existingExit.price - trade.entryPrice) * existingExit.quantity;
    }
    // Update trade's profitClosed and profitOpen accordingly
    trade.profitClosed =
      (trade.profitClosed || 0) -
      previousProfitAndLossClosedPosition +
      profitAndLossClosedPosition;

    // Profit for open positions calculated by the difference in CMP and entry price
    trade.profitOpen = profitAndLossOpenPosition;

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

    const existingTrade = trades.filter(
      (trade) => trade.isDeleted === false && trade.isGrouped === false
    );

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
    const existingTrade = trades.filter(
      (trade) => trade.isDeleted === false && trade.isGrouped === false
    );

    return {
      code: HttpStatus.OK,
      data: existingTrade,
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

      //new Condition added
      if (exitBody.quantity > 0) {
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
            ? trade.tradeType === 'Buy'
              ? (exitBody.price - trade.entryPrice) * exitBody.quantity
              : (trade.entryPrice - exitBody.price) * exitBody.quantity < 0
              ? 'Loss'
              : 'Profit'
            : null;
        const profitClosedPosition =
          resultClosedPosition === 'Profit'
            ? trade.tradeType === 'Buy'
              ? (exitBody.price - trade.entryPrice) * exitBody.quantity
              : (trade.entryPrice - exitBody.price) * exitBody.quantity
            : 0;
        const lossClosedPosition =
          resultClosedPosition === 'Loss'
            ? trade.tradeType === 'Buy'
              ? (exitBody.price - trade.entryPrice) * exitBody.quantity
              : (trade.entryPrice - exitBody.price) * exitBody.quantity
            : 0;
        const profitAndLossClosedPostion =
          trade.tradeType === 'Buy'
            ? (exitBody.price - trade.entryPrice) * exitBody.quantity
            : (trade.entryPrice - exitBody.price) * exitBody.quantity;
        const profitAndLossOpenPosition =
          position === 'Open'
            ? trade.tradeType === 'Buy'
              ? (trade.cmp - trade.entryPrice) *
                (trade.entryQuantity - accumulatedExitQuantity)
              : (trade.entryPrice - trade.cmp) *
                (trade.entryQuantity - accumulatedExitQuantity)
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
          profitAndLossClosedPostion,
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

        // Update trade's status and openQuantity
        trade.tradeStatus = position;
        trade.openQuantity = trade.entryQuantity - accumulatedExitQuantity;

        // Update trade's profitClosed and profitOpen
        trade.profitClosed =
          (trade.profitClosed || 0) + profitAndLossClosedPostion;
        // profitAndLossOpenPosition;
        trade.profitOpen = profitAndLossOpenPosition;
      }
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

export const groupTrade = async (body) => {
  try {
    const {
      userId,
      groupName,
      trades // Array of trade IDs
    } = body;

    // Fetch all trades to ensure they exist and are not marked as deleted
    const existingTrades = await Trade.find({
      _id: { $in: trades },
      isDeleted: false,
      isGrouped: false
    });

    if (existingTrades.length !== trades.length) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'Some trades are already grouped or are marked as deleted'
      };
    }

    // Validate that all trades have common fields
    const commonFields = ['market', 'broker'];

    for (const field of commonFields) {
      const fieldValues = existingTrades.map((trade) => trade[field]);
      const uniqueValues = new Set(fieldValues);
      if (uniqueValues.size > 1) {
        return {
          code: HttpStatus.BAD_REQUEST,
          data: [],
          message: `Trades have different ${field} values`
        };
      }
    }

    // Calculate total price and total quantity
    const totalQuantity = existingTrades.reduce(
      (acc, trade) => acc + (trade.entryQuantity || 0),
      0
    );
    const totalPrice = existingTrades.reduce(
      (acc, trade) => acc + trade.entryPrice * trade.entryQuantity,
      0
    );

    // Extract market and broker values from the first trade
    const { market, broker } = existingTrades[0];

    // Create a new GroupTrade object
    const newGroupTrade = new GroupTrade({
      userId,
      groupName,
      market,
      broker,
      quantity: totalQuantity,
      price: totalPrice,
      trades
    });

    // Save the new GroupTrade object to the database
    await newGroupTrade.save();

    // Update each trade with the groupTrade reference and set isGrouped to true
    await Trade.updateMany(
      { _id: { $in: trades } },
      { $set: { groupTrade: newGroupTrade._id, isGrouped: true } }
    );

    return {
      code: HttpStatus.CREATED,
      data: newGroupTrade,
      message: 'Group trade created successfully'
    };
  } catch (error) {
    console.error('Error in creating group trade:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
    };
  }
};

export const getAllTradeGroup = async (body) => {
  try {
    // Fetch group trades where userId matches and isDeleted is false
    const groupTrades = await GroupTrade.find({
      userId: body.userId,
      isDeleted: false // Only fetch non-deleted group trades
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
    console.error('Error in fetching group trades:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
    };
  }
};

export const updateGroupTrade = async (groupId, body) => {
  try {
    const tradeInput = body.trades;
    // Normalize the tradeInput to always be an array
    const tradeIds = Array.isArray(tradeInput) ? tradeInput : [tradeInput];

    // Check if the group trade exists
    const groupTrade = await GroupTrade.findById(groupId);
    if (!groupTrade) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'Not a valid GroupTrade ID'
      };
    }

    // Fetch all trades to ensure they exist, are not marked as deleted, and are not already grouped
    const existingTrades = await Trade.find({
      _id: { $in: tradeIds },
      isDeleted: false,
      isGrouped: false
    });

    if (existingTrades.length !== tradeIds.length) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message:
          'Some trades do not exist, are marked as deleted, or are already grouped'
      };
    }

    // Validate that all trades have common fields with the group trade
    const commonFields = ['market', 'broker'];

    for (const field of commonFields) {
      console.log(field);

      const groupFieldValue = groupTrade[field];
      // console.log(existingTrades);
      console.log(groupFieldValue);

      const tradeFieldValues = existingTrades.map((trade) => trade[field]);
      const uniqueValues = new Set(tradeFieldValues);
      if (uniqueValues.size > 1 || !uniqueValues.has(groupFieldValue)) {
        return {
          code: HttpStatus.BAD_REQUEST,
          data: [],
          message: `Trades have different ${field} values`
        };
      }
    }

    // Update the group trade's trades list
    groupTrade.trades.push(...tradeIds);
    // Calculate the new total quantity and total price
    const additionalQuantity = existingTrades.reduce(
      (acc, trade) => acc + (trade.entryQuantity || 0),
      0
    );
    const additionalPrice = existingTrades.reduce(
      (acc, trade) => acc + trade.entryPrice * trade.entryQuantity,
      0
    );

    groupTrade.groupName = body.groupName;
    groupTrade.quantity += additionalQuantity;
    groupTrade.price += additionalPrice;

    // Save the updated GroupTrade object to the database
    await groupTrade.save();

    // Update each trade with the groupTrade reference and set isGrouped to true
    await Trade.updateMany(
      { _id: { $in: tradeIds } },
      { $set: { groupTrade: groupTrade._id, isGrouped: true } }
    );

    // Return a success response
    return {
      code: HttpStatus.OK,
      data: groupTrade,
      message: 'Trade(s) updated successfully'
    };
  } catch (error) {
    console.error('Error in updating group trade:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
    };
  }
};

export const deleteGroupTrade = async (groupId) => {
  try {
    // Validate groupId
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'Invalid GroupTrade ID'
      };
    }

    // Find the GroupTrade by ID
    const groupTrade = await GroupTrade.findById(groupId);

    if (!groupTrade) {
      return {
        code: HttpStatus.NOT_FOUND,
        data: [],
        message: 'GroupTrade not found'
      };
    }

    // Check if the group is already marked as deleted
    if (groupTrade.isDeleted) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'GroupTrade is already marked as deleted'
      };
    }

    // Mark the GroupTrade as deleted by setting isDeleted to true
    groupTrade.isDeleted = true;
    await groupTrade.save();

    // Update all trades within this group to set isGrouped to false and remove groupTrade reference
    await Trade.updateMany(
      { groupTrade: groupId },
      { $set: { groupTrade: null, isGrouped: false } }
    );

    return {
      code: HttpStatus.OK,
      data: groupTrade,
      message: 'GroupTrade marked as deleted successfully'
    };
  } catch (error) {
    console.error('Error in deleting group trade:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
    };
  }
};

export const removeTradeFromGroup = async (groupId, tradeInput) => {
  try {
    // Normalize the tradeInput to always be an array
    const tradeIds = Array.isArray(tradeInput) ? tradeInput : [tradeInput];

    // Find the group trade by ID
    const groupTrade = await GroupTrade.findById(groupId);
    if (!groupTrade) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'Not a valid GroupTrade ID'
      };
    }

    // Ensure that each trade to be removed is actually part of the group
    const tradesToRemove = await Trade.find({
      _id: { $in: tradeIds },
      groupTrade: groupId,
      isGrouped: true
    });

    if (tradesToRemove.length !== tradeIds.length) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message:
          'Some trades are not part of this group or are already not grouped'
      };
    }

    // Update the group trade's trades list by filtering out the trades to be removed
    groupTrade.trades = groupTrade.trades.filter(
      (tradeId) => !tradeIds.includes(tradeId.toString())
    );

    // Update the quantity and price of the group trade
    const totalRemovedQuantity = tradesToRemove.reduce(
      (acc, trade) => acc + (trade.entryQuantity || 0),
      0
    );
    const totalRemovedPrice = tradesToRemove.reduce(
      (acc, trade) => acc + trade.entryPrice * trade.entryQuantity,
      0
    );

    groupTrade.quantity -= totalRemovedQuantity;
    groupTrade.price -= totalRemovedPrice;

    // If the trades array is empty, set isDeleted to true
    if (groupTrade.trades.length === 0) {
      groupTrade.isDeleted = true;
    }

    // Save the updated GroupTrade object to the database
    await groupTrade.save();

    // Update each trade to set groupTrade reference to null and isGrouped to false
    await Trade.updateMany(
      { _id: { $in: tradeIds } },
      { $set: { groupTrade: null, isGrouped: false } }
    );

    // Return a success response
    return {
      code: HttpStatus.OK,
      data: groupTrade,
      message: 'Trade(s) removed from group successfully'
    };
  } catch (error) {
    console.error('Error in removing trade from group:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
    };
  }
};
