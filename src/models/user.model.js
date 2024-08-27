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
  },
  timeZone: {
    type: String,
    default: ''
  },
  dateFormat: {
    type: String,
    default: ''
  },
  timeFormat: {
    type: String,
    default: ''
  },
  currency: {
    type: String,
    default: ''
  }
});

export default model('User', userSchema);
