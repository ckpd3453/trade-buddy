import express from 'express';
import multer from 'multer';
import * as dataController from '../controllers/data.controller';
import { userAuth } from '../middlewares/auth.middleware';

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory to save files
  },
  filename: (req, file, cb) => {
    // Convert Date.now() to a string and concatenate it with the original filename
    const uniqueSuffix = Date.now().toString() + '-' + file.originalname;
    cb(null, uniqueSuffix); // Correctly concatenated filename
  }
}); //for server storage
// const upload = multer({ dest: 'uploads/' });
const upload = multer({ storage });

router.post('/upload', upload.single('file'), dataController.uploadCSVData);

router.get('/:collectionName', dataController.getAllTimeZone);

export default router;
