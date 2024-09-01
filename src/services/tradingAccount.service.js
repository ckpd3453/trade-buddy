import HttpStatus from 'http-status-codes';
import TradingAccount from '../models/tradingAccount.model';
import User from '../models/user.model';

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
    // Update the document by setting isDeleted to true and updating the deletedTimeStamp
    const result = await TradingAccount.updateOne(
      { _id: broker_id }, // Condition to match the document
      {
        $set: {
          isDeleted: true, // Mark as deleted
          deletedTimeStamp: new Date() // Set the deleted timestamp to current date and time
        }
      }
    );

    if (result.nModified === 1) {
      return {
        code: HttpStatus.ACCEPTED,
        data: null,
        message: 'Broker account marked as deleted successfully'
      };
    } else {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: null,
        message: 'No broker account found with the given ID'
      };
    }
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: null,
      message: `Error marking broker account as deleted: ${error}`
    };
  }
};
