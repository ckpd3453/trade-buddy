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
  phoneNumber: {
    type: String
  }
});

export default model('User', userSchema);
