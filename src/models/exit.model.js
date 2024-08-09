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
  exitDate: { type: Date },
  exitTime: { type: String },
  quantity: { type: Number, require: true },
  price: { type: Number, require: true }
});

export default model('Exit', exitModel);
