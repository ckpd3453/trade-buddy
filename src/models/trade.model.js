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
  profitTarget: { type: String }, //need to remove
  stopLoss: { type: String }, //need to remove
  entryDate: { type: Date, require: true },
  //Add month and week prop
  entryTime: { type: String, require: true },
  tradeQuantity: { type: Number, require: true },
  tradeExitQuantity: { type: Number, require: true }, //need to remove
  tradeStatus: { type: String }, //need to remove
  brokerage: { type: String }, //need to remove
  cmp: { type: String }, //need to remove
  openQuantity: { type: Number, require: true }, //need to remove
  expiry: { type: String }, //need to remove
  price: { type: Number, require: true },
  exit: [{ type: Schema.Types.ObjectId, ref: 'Exit' }], // need to change the exit date arr to obj
  numOfLots: { type: Number }, //need to remove
  lotSize: { type: Number, require: true }, //need to remove
  openPosition: { type: String }, //need to remove
  profitClosed: { type: Number }, //need to remove
  profitOpen: { type: Number }, //need to remove
  groupTrade: { type: Schema.Types.ObjectId, ref: 'GroupTrade' }
});

export default model('Trade', tradeModel);
