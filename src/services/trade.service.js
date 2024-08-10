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

    const updatedTradeDetail = { tradingAccountId: newTradeAccountId, ...body };

    // Create the trade
    const trade = new Trade(updatedTradeDetail);
    await trade.save();

    // Update the trading account to include this trade
    await TradingAccount.findByIdAndUpdate(newTradeAccountId, {
      $push: { trades: trade._id }
    });

    // Fetch the latest price (this logic may need to be adapted to your app)
    const latestPrice = 400; //await getLatestPrice(); // Implement this function based on your needs

    // Create a default exit with quantity: 0 and the latest price
    const defaultExit = new Exit({
      tradingAccountId: newTradeAccountId,
      tradeId: trade._id,
      exitDate: new Date(),
      exitTime: new Date().toISOString().split('T')[1].split('.')[0], // Set current time
      quantity: 0,
      price: latestPrice
    });

    await defaultExit.save();

    // Update the trade to include this default exit
    trade.exit.push(defaultExit._id);
    await trade.save();

    return {
      code: HttpStatus.OK,
      data: { trade, defaultExit },
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

export const getAllTrade = async (tradingAccountId, body) => {
  try {
    const tradingAccount = await TradingAccount.findById(
      tradingAccountId
    ).populate('trades');

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
    const tradingAccount = await TradingAccount.findOne({
      userId: body.userId
    }).populate('trades');

    console.log('Fetched Trading Account:', tradingAccount);

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

    // Update the trade to include this exit
    trade.exit.push(exit._id);
    await trade.save();

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

export const getAllTradeGroup = async () => {
  try {
    const groupTrades = await GroupTrade.find().populate('trades');

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

    // Log the updated group trade
    console.log('Updated group trade:', groupTrade);

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
