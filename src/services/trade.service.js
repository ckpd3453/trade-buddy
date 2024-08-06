import Trade from '../models/trade.model';
import TradingAccount from '../models/tradingAccount.model';
import GroupTrade from '../models/groupTrade.model';
import HttpStatus from 'http-status-codes';
import mongoose from 'mongoose';
import Exit from '../models/exit.model';

export const createTrade = async (tradeAccountId, body) => {
  try {
    const newTradeAccountId = mongoose.Types.ObjectId(tradeAccountId);
    const updatedTradeDetail = { tradingAccountId: newTradeAccountId, ...body };

    const trade = new Trade(updatedTradeDetail);
    await trade.save();

    // Update the trading account to include this trade
    await TradingAccount.findByIdAndUpdate(newTradeAccountId, {
      $push: { trades: trade._id }
    });

    return {
      code: HttpStatus.OK,
      data: trade,
      message: 'Added Manual trade successfully'
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
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
    const tradingAccount = await TradingAccount.findById(body.userId).populate(
      'trades'
    );

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

// New service function to create exit data
export const createExit = async (tradeId, body) => {
  try {
    console.log(tradeId, body);
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'Trade not found'
      };
    }

    const exit = new Exit({
      tradingAccountId: trade.tradingAccountId,
      tradeId,
      ...body
    });
    await exit.save();

    trade.exit.push(exit._id);
    await trade.save();

    return {
      code: HttpStatus.OK,
      data: exit,
      message: 'Exit created and trade updated successfully'
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
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
