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
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email
    },
    process.env.TOKEN_KEY
  );
  return token;
};

export const sendResetPasswordMail = async (email, userId) => {
  try {
    // Generate a JWT token
    const token = jwt.sign({ id: userId }, process.env.TOKEN_KEY, {
      expiresIn: '1h'
    });

    console.log(token);

    const resetLink = `http://localhost:5000/reset?token=${token}`;

    const base64EncodedLink = Buffer.from(resetLink).toString('base64');
    console.log('ResetLink: ' + base64EncodedLink);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      }
    });

    const mailConfigurations = {
      from: 'tradebuddyteam@gmail.com',
      to: email,
      subject: 'Reset Your Password',
      html: `
      <h2>Password Reset</h2>
      <p>Hi! There, You have requested to reset your password.</p>
      <p>Please click on the link below to reset your password:</p>
      <a href="${resetLink}" style="display:inline-block;padding:10px 20px;color:#fff;background-color:#007bff;text-decoration:none;border-radius:5px;">Click Me</a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Thanks,</p>
      <p>TradeBuddy Team</p>
    `
    };

    const info = await transporter.sendMail(mailConfigurations);
    console.log(
      'Reset password email sent successfully to',
      info.envelope.to[0]
    );
  } catch (error) {
    console.error('Error sending reset password email:', error.message);
  }
};
