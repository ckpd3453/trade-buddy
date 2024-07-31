import User from '../models/user.model';
import HttpStatus from 'http-status-codes';
import * as userUtils from '../utils/user.util';
import { createTradingAccount } from './tradingAccount.service';

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
        message: `User Already Exist, Please login with ${user.email}.`
      };
    }

    const secureUser = await userUtils.hashPassword(user);

    console.log(user);

    const { accountName, ...newUser } = secureUser;
    const data = new User(newUser);
    await data.save();
    await createTradingAccount({
      userId: data._id,
      bankName: user.accountName
    });
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

export const signIn = async (userCredential) => {
  try {
    const checkUser = await User.findOne({ email: userCredential.email });

    if (checkUser) {
      const checkPassword = await userUtils.validatePassword(
        userCredential,
        checkUser
      );
      if (checkPassword) {
        const token = await userUtils.getToken(checkUser);
        return {
          code: HttpStatus.OK,
          data: token,
          message: 'user login success.'
        };
      } else {
        return {
          code: HttpStatus.BAD_REQUEST,
          data: [],
          message: 'Please enter valid password'
        };
      }
    } else {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'User is not registered, please SignUp first.'
      };
    }
  } catch (error) {
    console.error('Error logging in user:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: `something went wrong
              ${error}`
    };
  }
};

export const updateProfile = async (updateBody) => {
  try {
    console.log(updateBody);
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

export const getAllAccount = async () => {
  try {
    const userAccounts = await User.find()
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
    console.error('Error getting all user:', error);
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
      const token = await userUtils.getToken(user);
      userUtils.sendVerificationMail(body.email, token);
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
    if (body.password !== null) {
      const updatePassword = await updateProfile(body.userId, body);

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
