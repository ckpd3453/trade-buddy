import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  email: {
    type: String
  },
  password: {
    type: String
  },
  country: {
    type: String
  },
  timeZone: {
    type: String
  },
  dateFormat: {
    type: String
  },
  timeFormat: {
    type: String
  },
  accountName: [{ type: Schema.Types.ObjectId, ref: 'TradingAccount' }]
});

export default model('User', userSchema);
