import { Schema, model } from 'mongoose';

// Function to get or create a model with a dynamic schema
const exitModel = new Schema({
  userId: {
    type: String
  },
  tradingAccountId: {
    type: Schema.Types.ObjectId,
    ref: 'TradingAccount',
    required: true
  },
  tradeId: {
    type: Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },
  exitDate: { type: String },
  exitTime: { type: String }
});

export default model('Exit', exitModel);
