import { Schema, model } from 'mongoose';

// Function to get or create a model with a dynamic schema
const tradeModel = new Schema({
  userId: {
    type: String
  },
  tradingAccountId: {
    type: Schema.Types.ObjectId,
    ref: 'TradingAccount',
    required: true
  },
  market: {
    type: String
  },
  account: { type: String },
  broker: { type: String },
  assessment: { type: String },
  strategy: { type: String },
  instrument: { type: String },
  tradeType: { type: String },
  entryDate: { type: String },
  entryTime: { type: String },
  quantity: { type: Number },
  price: { type: Number },
  exit: [{ type: Schema.Types.ObjectId, ref: 'Exit' }],
  openPosition: { type: String },
  profitClosed: { type: Number },
  profitOpen: { type: Number },
  groupTrade: { type: Schema.Types.ObjectId, ref: 'GroupTrade' }
});

export default model('Trade', tradeModel);
