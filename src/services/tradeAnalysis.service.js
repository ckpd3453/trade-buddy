import exitModel from '../models/exit.model';
import tradeModel from '../models/trade.model';
import HttpStatus from 'http-status-codes';

export const getAllTradeAnalysis = async (tradeId) => {
  const trade = await tradeModel.findById(tradeId._id);

  const exit = await exitModel.findById(trade.exit);

  const position = trade.tradeQuantity > exit.quantity ? 'Open' : 'Close';
  const resultClosedPosition =
    position == 'Close'
      ? (exit.price - trade.price) * exit.quantity < 0
        ? 'Loss'
        : 'Profit'
      : null;
  const profitClosedPosition =
    resultClosedPosition == 'Profit'
      ? (exit.price - trade.price) * exit.quantity
      : null;
  const lossClosedPosition =
    resultClosedPosition == 'Loss'
      ? (exit.price - trade.price) * exit.quantity
      : null;
  const profitAndLossOpenPosition =
    position == 'Open' ? (exit.price - trade.price) * exit.quantity : null;
  const remainingQuantity = trade.tradeQuantity - exit.quantity;
  const tradeDuration =
    position == 'Close'
      ? (exit.exitDate - trade.entryDate) / (1000 * 60 * 60 * 24)
      : null;
  const tradeStrategy =
    tradeDuration > 10 || tradeDuration == null
      ? 'Investment'
      : tradeDuration <= 0
      ? 'Intraday'
      : 'Swing';
  const investment =
    trade.tradeType == 'Buy'
      ? trade.tradeQuantity * trade.price
      : exit.quantity * exit.price;
  const roi =
    position == 'Open'
      ? (profitAndLossOpenPosition * 100) / investment
      : (profitClosedPosition * 100) / investment;

  const analysis = {
    tradeId: tradeId._id,
    position: position, // if(tradeQuantity > exitradeQuantity) ?Open: Close,
    resultClosedPosition: resultClosedPosition, // if(position == Close) ? (selling price - buying price * sell quant) : null,
    profitClosedPosition: profitClosedPosition, // if(resultClosedPosition == profit) ? (selling Price - buying price * quantity) : null,
    lossClosedPosition: lossClosedPosition, // if(resultClosedPosition == loss) ? (selling Price - buying price * quantity) : null,
    profitAndLossOpenPosition: profitAndLossOpenPosition, // if(position == Open) ? (sellingPrice - buyingPrice * quant) : null,
    remainingQuantity: remainingQuantity, // boughtQunatity - SoldQuantity
    tradeDuration: tradeDuration, // if(position == Close) ? (exitDate - entryDate),
    tradeStrategy: tradeStrategy, // if(tradeDuration < 0) ?"Intraday": if(tradeDuration < 10) ?"Swing": "Investment",
    investment: investment, // if(typrOfTrade == "Buy") ?BuyQuantity * price : SellQuantity * sellingPrice,
    roi: roi
    // if(Position == Open) ? (profitLossAtOpenPosition * 100) / investment : (profitLossAtClosedPosition * 100) / investment
  };
  return {
    code: HttpStatus.OK,
    data: analysis,
    message: 'All trades fetched successfully'
  };
};
