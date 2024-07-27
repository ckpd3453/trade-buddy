import * as dataService from '../services/data.service';
import HttpStatus from 'http-status-codes';

export const uploadCSVData = async (req, res) => {
  const { file } = req;
  if (!file) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      code: HttpStatus.BAD_REQUEST,
      data: null,
      message: 'File not uploaded'
    });
  }
  const data = await dataService.uploadCSVData(file.path);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};

export const getAllTimeZone = async (req, res) => {
  const data = await dataService.getAllTimeZone(req.params.collectionName);
  res.status(data.code).json({
    code: data.code,
    data: data.data,
    message: data.message
  });
};
