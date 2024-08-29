import { Schema, model } from 'mongoose';

// Function to get or create a model with a dynamic schema
const brokerAccount = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  account: { type: String },
  trades: [{ type: Schema.Types.ObjectId, ref: 'Trade' }], // need o remove
  createdTimeStamp: {
    type: Date,
    default: Date.now // Automatically sets the created time to the current time
  },
  isDeleted: {
    type: Boolean,
    default: false // Default value is false, indicating the account is not deleted
  },
  deletedTimeStamp: {
    type: Date,
    default: null // Timestamp to record when the account is deleted, initially set to null
  }
});

export default model('brokerAccount', brokerAccount);
