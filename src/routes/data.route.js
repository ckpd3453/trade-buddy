import express from 'express';
import multer from 'multer';
import * as dataController from '../controllers/data.controller';
import { userAuth } from '../middlewares/auth.middleware';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), userAuth, dataController.uploadCSVData);

router.get('/:collectionName', dataController.getAllTimeZone);

export default router;
