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
  exchange: { type: String },
  brokerName: { type: String },
  marketAssessment: { type: String },
  tradeStrategy: { type: String },
  stockName: { type: String },
  tradeType: { type: String },
  profitTarget: { type: String },
  stopLoss: { type: String },
  entryDate: { type: String },
  entryTime: { type: String },
  tradeQuantity: { type: Number },
  tradeExitQuantity: { type: Number },
  tradeStatus: { type: String },
  brokerage: { type: String },
  cmp: { type: String },
  openQuantity: { type: Number },
  expiry: { type: String },
  price: { type: Number },
  exit: [{ type: Schema.Types.ObjectId, ref: 'Exit' }],
  numOfLots: { type: String },
  lotSize: { type: String },
  openPosition: { type: String },
  profitClosed: { type: Number },
  profitOpen: { type: Number },
  groupTrade: { type: Schema.Types.ObjectId, ref: 'GroupTrade' }
});

export default model('Trade', tradeModel);
