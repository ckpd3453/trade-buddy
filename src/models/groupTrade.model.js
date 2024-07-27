import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const groupTradeSchema = new Schema({
  userId: { type: String, required: true },
  groupName: { type: String, required: true },
  market: { type: String, required: true },
  account: { type: String, required: true },
  broker: { type: String, required: true },
  assessment: { type: String, required: true },
  strategy: { type: String, required: true },
  instrument: { type: String, required: true },
  tradeType: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  trades: [{ type: Schema.Types.ObjectId, ref: 'Trade' }]
});

const GroupTrade = model('GroupTrade', groupTradeSchema);

export default GroupTrade;
