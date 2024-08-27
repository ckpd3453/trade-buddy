import { Schema, model } from 'mongoose';

// Function to get or create a model with a dynamic schema
const assetMasterSchema = new Schema(
  {
    securityId: {
      type: String
    },
    exchangeType: {
      type: String
    },
    assetName: {
      type: String
    }
  },
  { collection: 'assetmasters' }
);

export default model('Asset', assetMasterSchema);
