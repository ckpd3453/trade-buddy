import * as UserService from '../services/user.service';

/**
 * SignUp-API :-
 * @param {client side request for user detail} req
 * @param {server side response as json format} res
 */
export const signUp = async (req, res) => {
  console.log('InController=========>>>>>>>>');
  const data = await UserService.signUp(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

/**
 * SignIn-API :-
 * @param {client side request for user credential} req
 * @param {server side response as json format} res
 */
export const signIn = async (req, res) => {
  const data = await UserService.signIn(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

/**
 * UpdateProfile-API :-
 * @param {*} req
 * @param {*} res
 */
export const updateProfile = async (req, res) => {
  const data = await UserService.updateProfile(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

/**
 * GetAll-API :-
 * @param {*} req
 * @param {*} res
 */
export const getAllAccount = async (req, res) => {
  const data = await UserService.getAllAccount();
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

/**
 * ForgotPassword-API :-
 * @param {*} req
 * @param {*} res
 */
export const forgetPassword = async (req, res) => {
  const data = await UserService.forgetPassword(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

/**
 * ResetPassword-API :
 * @param {*} req
 * @param {*} res
 */
export const resetPassword = async (req, res) => {
  const data = await UserService.resetPassword(req.body);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};
