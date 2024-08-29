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
  }, //broker_account
  market: {
    type: String
  },
  instrument: {
    type: String
  },
  account: { type: String }, // need to remove
  exchange: { type: String },
  brokerName: { type: String }, //need to remove
  marketAssessment: { type: String },
  tradeStrategy: { type: String },
  stockName: { type: String }, // as assetName, commodityName, forexPairName so need to remove
  tradeType: { type: String },
  stopLoss: { type: String },
  entryDate: { type: Date, require: true },
  //Add month and week prop
  entryTime: { type: String, require: true },
  strikePrice: { type: Number },
  entryQuantity: { type: Number, require: true }, //entry
  tradeStatus: { type: String },
  brokerage: { type: String },
  cmp: { type: String },
  openQuantity: { type: Number, require: true },
  expiry: { type: String },
  entryPrice: { type: Number, require: true }, //Entry Price
  exit: [{ type: Schema.Types.ObjectId, ref: 'Exit' }], // need to change the exit date arr to obj
  numOfLots: { type: Number },
  lotSize: { type: Number },
  openPosition: { type: String },
  profitClosed: { type: Number },
  profitOpen: { type: Number },
  isGrouped: { type: Boolean, default: false },
  remarks: { type: String },
  futureOptions: { type: String },
  assetName: { type: String },
  groupTrade: { type: Schema.Types.ObjectId, ref: 'GroupTrade' }
});

export default model('Trade', tradeModel);
