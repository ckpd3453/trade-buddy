import express from 'express';
import * as userController from '../controllers/user.controller';
import { newUserValidator } from '../validators/user.validator';
import { userAuth } from '../middlewares/auth.middleware';

const router = express.Router();

router.get('test', (req, res) => {
  res.json('Hello Bro');
});
//User-SignUp
router.post('/', newUserValidator, userController.signUp);

//User-SignIn
router.post('/signIn', userController.signIn);

//User-Profile-Update
router.put('/', userAuth, userController.updateProfile);

//Get-All-User-Accounts
router.get('/', userAuth, userController.getAllAccount);

//Forgot Password
router.post('/forget', userController.forgetPassword);

//Reset Password
router.post('/reset', userAuth, userController.resetPassword);
export default router;
