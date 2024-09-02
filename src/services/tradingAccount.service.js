import HttpStatus from 'http-status-codes';
import TradingAccount from '../models/tradingAccount.model';
import User from '../models/user.model';
import mongoose from 'mongoose';
import Trade from '../models/trade.model';

export const createBrokerAccount = async (updateBody) => {
  try {
    const userId = updateBody.userId;
    const tradingAccount = new TradingAccount({
      userId,
      account: updateBody.account
    });
    await tradingAccount.save();
    // Update the user to include this trading account
    await User.findByIdAndUpdate(userId, {
      $push: { accountName: tradingAccount._id }
    });
    return {
      code: HttpStatus.CREATED,
      data: tradingAccount,
      message: 'Account created successfully'
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
    };
  }
};

export const getAllBrokerAccountList = async (body) => {
  const allTradingAccount = await TradingAccount.find({
    userId: body.userId
  })
    .populate('userId')
    .populate('trades')
    .populate('accountName')
    .populate('exit');

  const nonDeletedAccount = allTradingAccount.filter(
    (brokerAccount) => brokerAccount.isDeleted == false
  );

  return {
    code: HttpStatus.OK,
    data: nonDeletedAccount,
    message: 'All Broker Account fetched successfull'
  };
};

export const trashBrokerAccount = async (broker_id) => {
  try {
    // Validate broker_id
    if (!mongoose.Types.ObjectId.isValid(broker_id)) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: null,
        message: 'Invalid broker account ID'
      };
    }

    // Update the TradingAccount document by setting isDeleted to true and updating the deletedTimeStamp
    const result = await TradingAccount.updateOne(
      { _id: broker_id }, // Condition to match the document
      {
        $set: {
          isDeleted: true, // Mark as deleted
          deletedTimeStamp: new Date() // Set the deleted timestamp to current date and time
        }
      }
    );

    // Check if the broker account was marked as deleted
    if (result.nModified === 1) {
      // Now mark all associated trades as deleted
      await Trade.updateMany(
        { brokerAccountId: broker_id }, // Condition to match associated trades
        {
          $set: {
            isDeleted: true, // Mark trades as deleted
            deletedTimeStamp: new Date() // Optionally set the deleted timestamp for trades
          }
        }
      );

      return {
        code: HttpStatus.ACCEPTED,
        data: null,
        message:
          'Broker account and associated trades marked as deleted successfully'
      };
    } else {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: null,
        message: 'No broker account found with the given ID'
      };
    }
  } catch (error) {
    console.error('Error in trashing broker account:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: null,
      message: `Error marking broker account as deleted: ${error}`
    };
  }
};
