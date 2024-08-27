import { Schema, model } from 'mongoose';

// OTP schema for storing OTP data in the database
const otpSchema = new Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // OTP expires in 5 minutes
});

export default model('OtpModel', otpSchema);
