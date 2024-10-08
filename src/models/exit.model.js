import { Schema, model } from 'mongoose';

// Function to get or create a model with a dynamic schema
const exitModel = new Schema({
  tradeId: {
    type: Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },
  exitDate: { type: Date },
  exitTime: { type: String },
  quantity: { type: Number, require: true },
  price: { type: Number, require: true },
  // Reference to TradeAnalysis
  tradeAnalysis: [
    {
      type: Schema.Types.ObjectId,
      ref: 'TradeAnalysis'
    }
  ]
});

export default model('Exit', exitModel);
