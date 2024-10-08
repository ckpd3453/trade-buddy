const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
import dotenv from 'dotenv';
dotenv.config();

export const hashPassword = async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
  return user;
};

export const validatePassword = async (loginUser, dbUser) => {
  const checkPassword = await bcrypt.compare(
    loginUser.password,
    dbUser.password
  );
  return checkPassword;
};

export const getToken = async (user) => {
  console.log(process.env.TOKEN_KEY);

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email
    },
    process.env.TOKEN_KEY
  );
  return token;
};

export const sendMail = async (email, userId, type) => {
  try {
    // Generate a JWT token
    const token = jwt.sign({ id: userId }, process.env.TOKEN_KEY, {
      expiresIn: '1h'
    });

    console.log(token);

    const resetLink = `https://tradebuddy-v1.vercel.app/reset/${token}`;

    const base64EncodedLink = Buffer.from(resetLink).toString('base64');
    console.log('ResetLink: ' + base64EncodedLink);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      }
    });

    let mailConfigurations;

    if (type.message === 'registration') {
      // Registration success email
      mailConfigurations = {
        from: 'tradebuddyteam@gmail.com',
        to: email,
        subject: 'Welcome to TradeBuddy!',
        html: `
          <h2>Welcome to TradeBuddy!</h2>
          <p>Hi there!</p>
          <p>Thank you for registering with TradeBuddy. Your account has been successfully created.</p>
          <p>If you have any questions or need assistance, feel free to reply to this email.</p>
          <p>We are excited to have you with us!</p>
          <p>Thanks,</p>
          <p>TradeBuddy Team</p>
        `
      };
    } else if (type.message === 'reset') {
      // Password reset email
      mailConfigurations = {
        from: 'tradebuddyteam@gmail.com',
        to: email,
        subject: 'Password Reset Request',
        html: `
          <h2>Password Reset Requested</h2>
          <p>Hi there!</p>
          <p>We received a request to reset your password. Please click the link below to reset your password:</p>
          <a href="${resetLink}" style="display:inline-block;padding:10px 20px;color:#fff;background-color:#007bff;text-decoration:none;border-radius:5px;">Reset Password</a>
          <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
          <p>Thanks,</p>
          <p>TradeBuddy Team</p>
        `
      };
    } else if (type.message === 'otp' && type.otp) {
      console.log('In Otp Generator================>>>>>>>>>>>>>>>');

      // OTP email
      mailConfigurations = {
        from: 'tradebuddyteam@gmail.com',
        to: email,
        subject: 'Your One-Time Password (OTP)',
        html: `
          <h2>Your OTP Code</h2>
          <p>Hi there!</p>
          <p>Your OTP code is: <strong>${type.otp}</strong></p>
          <p>Please enter this code to proceed with your login.</p>
          <p>If you did not request this code, please ignore this email or contact support.</p>
          <p>Thanks,</p>
          <p>TradeBuddy Team</p>
        `
      };
    } else {
      throw new Error('Invalid email type specified');
    }

    const info = await transporter.sendMail(mailConfigurations);
    console.log(
      'Reset password email sent successfully to',
      info.envelope.to[0]
    );
  } catch (error) {
    console.error('Error sending reset password email:', error.message);
  }
};
