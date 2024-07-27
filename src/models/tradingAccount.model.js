import { Schema, model } from 'mongoose';

// Function to get or create a model with a dynamic schema
const tradingAccount = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  account: { type: String },
  trades: [{ type: Schema.Types.ObjectId, ref: 'Trade' }]
});

export default model('TradingAccount', tradingAccount);
