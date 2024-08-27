import express from 'express';
import * as userController from '../controllers/user.controller';
import { newUserValidator } from '../validators/user.validator';
import { userAuth } from '../middlewares/auth.middleware';

const router = express.Router();

//User-SignUp
router.post('/', newUserValidator, userController.signUp);

router.post('/otpGenerator', userController.generateOtp);
//User-SignIn
router.post('/signIn', userController.signIn);

//User-Profile-Update
router.put('/', userAuth, userController.updateProfile);

//Get-All-User-Accounts
router.get('/', userAuth, userController.getUserAccount);

//Forgot Password
router.post('/forget', userController.forgetPassword);

//Reset Password
router.post('/reset', userAuth, userController.resetPassword);
export default router;
