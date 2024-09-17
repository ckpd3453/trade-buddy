import { Schema, model } from 'mongoose';

// Function to get or create a model with a dynamic schema
const tradeModel = new Schema({
  userId: {
    type: String
  },
  brokerAccountId: {
    type: Schema.Types.ObjectId,
    ref: 'brokerAccount',
    required: true
  }, //broker_account
  broker: {
    type: String
  },
  market: {
    type: String
  },
  instrument: {
    type: String
  },
  exchange: { type: String },
  marketAssessment: { type: String },
  tradeStrategy: { type: String },
  assetName: { type: String },
  tradeType: { type: String },
  stopLoss: { type: Number },
  entryDate: { type: Date, require: true },
  //Add month and week prop
  entryTradeMonth: { type: String },
  entryTradeWeek: { type: String },
  entryTime: { type: String, require: true },
  strikePrice: { type: Number },
  entryQuantity: { type: Number, require: true },
  tradeStatus: { type: String, default: 'Open' },
  brokerage: { type: Number },
  cmp: { type: Number },
  openQuantity: { type: Number, require: true },
  expiry: { type: String },
  entryPrice: { type: Number, require: true },
  exit: [{ type: Schema.Types.ObjectId, ref: 'Exit' }], // need to change the exit date arr to obj
  numOfLots: { type: Number },
  lotSize: { type: Number },
  profitClosed: { type: Number },
  profitOpen: { type: Number },
  isGrouped: { type: Boolean, default: false },
  remarks: { type: String },
  futureOptions: { type: String },
  CEPE: { type: String },
  groupTrade: { type: Schema.Types.ObjectId, ref: 'GroupTrade' },
  isDeleted: { type: Boolean, default: false }
});

export default model('Trade', tradeModel);
