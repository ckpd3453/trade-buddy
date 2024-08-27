import { Schema, model } from 'mongoose';

// Function to get or create a model with a dynamic schema
const assetModel = new Schema({
  securityId: {
    type: String
  },
  exchangeType: {
    type: String
  },
  assetName: {
    type: String
  }
});

export default model('Asset', assetModel);
