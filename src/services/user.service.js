import User from '../models/user.model';
import HttpStatus from 'http-status-codes';
import * as userUtils from '../utils/user.util';
import OtpModel from '../models/OtpModel';

/**
 * @param {req.body} user
 * @returns {code, data, message}
 */
export const signUp = async (user) => {
  try {
    const existingUser = await User.findOne({ email: user.email });
    if (existingUser) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: `User already exist with this email.`
      };
    }

    const secureUser = await userUtils.hashPassword(user);

    const data = new User(secureUser);
    await data.save();

    await userUtils.sendMail(data.email, data._id, { message: 'registration' });
    return {
      code: HttpStatus.CREATED,
      data: data,
      message: `User with user id ${user.email} is SignUp Success, Please SignIn.`
    };
  } catch (err) {
    console.error('Error sigining up user:', err);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: `Something Went wrong`
    };
  }
};

export const generateOtp = async (email) => {
  console.log(email);

  // Generate a 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  console.log(otp);

  try {
    // Check if an OTP already exists for the email
    const checkExistingOtp = await OtpModel.findOne({ email: email });

    let savedOtp;
    if (!checkExistingOtp) {
      // If no existing OTP, create a new one
      savedOtp = await OtpModel.create({ email: email, otp: otp });
    } else {
      // If OTP exists, update it
      savedOtp = await OtpModel.updateOne({ email: email }, { otp: otp });
    }

    await userUtils.sendMail(email, null, { message: 'otp', otp: otp });
    return {
      code: HttpStatus.OK,
      data: email, // Return email and OTP for debugging
      message: `Otp is sent to your email id ${email}`
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Failed to generate OTP'
    };
  }
};

export const signIn = async (userCredential) => {
  try {
    const { email, password, otp } = userCredential;

    // Check if the user exists
    const checkUser = await User.findOne({ email: email });

    if (checkUser) {
      if (password) {
        // Password-based login
        const checkPassword = await userUtils.validatePassword(
          userCredential,
          checkUser
        );

        if (checkPassword) {
          // Generate a token after successful password validation
          const token = await userUtils.getToken(checkUser);

          return {
            code: HttpStatus.OK,
            data: {
              fName: checkUser.firstName,
              lName: checkUser.lastName,
              token: token
            },
            message: 'User login success.'
          };
        } else {
          return {
            code: HttpStatus.BAD_REQUEST,
            data: [],
            message: 'Please enter a valid password'
          };
        }
      } else if (otp) {
        // OTP-based login
        const checkOtp = await OtpModel.findOne({ email: email, otp: otp });

        if (checkOtp) {
          // Generate a token after successful OTP validation
          const token = await userUtils.getToken(checkUser);

          // Optionally delete the OTP after successful login to prevent reuse
          await OtpModel.deleteOne({ email: email, otp: otp });

          return {
            code: HttpStatus.OK,
            data: {
              fName: checkUser.firstName,
              lName: checkUser.lastName,
              token: token
            },
            message: 'User login success using OTP.'
          };
        } else {
          return {
            code: HttpStatus.BAD_REQUEST,
            data: [],
            message: 'Invalid OTP, please try again.'
          };
        }
      } else {
        return {
          code: HttpStatus.BAD_REQUEST,
          data: [],
          message: 'Please provide a valid password or OTP to log in.'
        };
      }
    } else {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'User is not registered, please sign up first.'
      };
    }
  } catch (error) {
    console.error('Error logging in user:', error);

    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: `Something went wrong: ${error.message}`
    };
  }
};

export const updateProfile = async (updateBody) => {
  try {
    const user = await User.findById(updateBody.userId);

    if (!user) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'User Id is not valid.'
      };
    }

    // Update user fields based on updateBody
    if (updateBody.firstName) {
      user.firstName = updateBody.firstName;
    }
    if (updateBody.lastName) {
      user.lastName = updateBody.lastName;
    }
    if (updateBody.email) {
      user.email = updateBody.email;
    }
    if (updateBody.password) {
      const securePasswordUser = await userUtils.hashPassword(updateBody);
      user.password = securePasswordUser.password;
    }
    if (updateBody.country) {
      user.country = updateBody.country;
    }
    if (updateBody.timeZone) {
      user.timeZone = updateBody.timeZone;
    }
    if (updateBody.dateFormat) {
      user.dateFormat = updateBody.dateFormat;
    }
    if (updateBody.timeFormat) {
      user.timeFormat = updateBody.timeFormat;
    }
    if (updateBody.currency) {
      user.currency = updateBody.currency;
    }

    const updatedUser = await user.save();
    return {
      code: HttpStatus.OK,
      data: updatedUser,
      message: 'User updated successfully'
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
    };
  }
};

export const getUserAccount = async (userId) => {
  try {
    const userAccounts = await User.findById(userId)
      .select('-password')
      .populate({
        path: 'accountName'
      })
      .populate({
        path: 'trades'
      })
      .exec();

    return {
      code: HttpStatus.OK,
      data: userAccounts,
      message: 'Accounts fetched successfully'
    };
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something went wrong'
    };
  }
};

export const forgetPassword = async (body) => {
  try {
    // const user = await userCheck(body);
    const user = await User.findOne({ email: body.email });
    if (user == null) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: `${body.email} is not registered. `,
        message: 'Pease register your email id.'
      };
    } else {
      // const token = await userUtils.getToken(user);
      await userUtils.sendMail(body.email, user._id, { message: 'reset' });

      return {
        code: HttpStatus.OK,
        data: `Link Sent`,
        message: 'link sent to your verification mail'
      };
    }
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something Went wrong.'
    };
  }
};

export const resetPassword = async (body) => {
  try {
    if (body.password != null) {
      const updatePassword = await updateProfile(body);

      return {
        code: HttpStatus.OK,
        data: updatePassword.data,
        message: 'Password reset successful.'
      };
    } else {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: null,
        message: 'Please enter password to reset'
      };
    }
  } catch (error) {
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something Went wrong.'
    };
  }
};
