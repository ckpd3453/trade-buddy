import { Schema, model } from 'mongoose';

// Function to get or create a model with a dynamic schema
const tradeAnalysis = new Schema({
  tradeId: {
    type: Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },
  position: { type: String },
  resultClosedPosition: { type: String },
  profitClosedPosition: { type: String },
  lossClosedPosition: { type: String },
  profitAndLossOpenPosition: { type: String },
  remainingQuantity: { type: String },
  tradeDuration: { type: String },
  tradeStrategyType: { type: String },
  investment: { type: String },
  roi: { type: String }
});

export default model('TradeAnalysis', tradeAnalysis);
