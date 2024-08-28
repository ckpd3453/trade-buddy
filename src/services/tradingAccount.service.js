import HttpStatus from 'http-status-codes';
import TradingAccount from '../models/tradingAccount.model';
import User from '../models/user.model';

export const createTradingAccount = async (updateBody) => {
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

export const getAllTradingAccountList = async (body) => {
  console.log(body);
  const allTradingAccount = await TradingAccount.find({
    userId: body.userId
  })
    .populate('userId')
    .populate('trades')
    .populate('accountName')
    .populate('exit');

  return {
    code: HttpStatus.OK,
    data: allTradingAccount,
    message: 'All Trading list fetched successfull'
  };
};
