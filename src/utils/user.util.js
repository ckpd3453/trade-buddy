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

export const sendVerificationMail = (email, token) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD
    }
  });
  const mailConfigurations = {
    from: 'chandrakantprasad573@gmail.com',

    to: email,

    subject: 'For Email Verification',

    text: `Hi! There, You have recently visited our website and entered your email.
   
             Requested OTP : - ${token} 
         
             Thanks`
  };

  transporter.sendMail(mailConfigurations, function (error, info) {
    if (error) throw Error(error);
    console.log('Email Sent Successfully to', info.envelope.to[0]);
  });
};
