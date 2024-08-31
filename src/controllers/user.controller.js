import * as UserService from '../services/user.service';
import { responseObj } from '../utils/responseDto';

/**
 * SignUp-API :-
 * @param {client side request for user detail} req
 * @param {server side response as json format} res
 */
export const signUp = async (req, res) => {
  const data = await UserService.signUp(req.body);
  res.status(data.code).json(responseObj(data));
};

export const generateOtp = async (req, res) => {
  const data = await UserService.generateOtp(req.body.email);
  res.status(data.code).json(responseObj(data));
};

/**
 * SignIn-API :-
 * @param {client side request for user credential} req
 * @param {server side response as json format} res
 */
export const signIn = async (req, res) => {
  const data = await UserService.signIn(req.body);
  res.status(data.code).json(responseObj(data));
};

/**
 * UpdateProfile-API :-
 * @param {*} req
 * @param {*} res
 */
export const updateProfile = async (req, res) => {
  const data = await UserService.updateProfile(req.body);
  res.status(data.code).json(responseObj(data));
};

/**
 * GetAll-API :-
 * @param {*} req
 * @param {*} res
 */
export const getUserAccount = async (req, res) => {
  const data = await UserService.getUserAccount(req.body.userId);
  res.status(data.code).json(responseObj(data));
};

/**
 * ForgotPassword-API :-
 * @param {*} req
 * @param {*} res
 */
export const forgetPassword = async (req, res) => {
  const data = await UserService.forgetPassword(req.body);
  res.status(data.code).json(responseObj(data));
};

/**
 * ResetPassword-API :
 * @param {*} req
 * @param {*} res
 */
export const resetPassword = async (req, res) => {
  const data = await UserService.resetPassword(req.body);
  res.status(data.code).json(responseObj(data));
};
