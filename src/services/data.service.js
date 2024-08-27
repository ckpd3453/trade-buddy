const getModel = require('../models/data.model');
import HttpStatus from 'http-status-codes';
import { cleanup, parseCSV } from '../utils/data.util';
import Asset from '../models/assetMaster';

export const uploadCSVData = async (filePath) => {
  try {
    if (!filePath) {
      return {
        code: HttpStatus.BAD_REQUEST,
        data: [],
        message: 'Not able to fetch file path'
      };
    }
    const results = await parseCSV(filePath);

    const collections = {};
    results.forEach((row) => {
      const { SchemaName: schemaName, ...data } = row; // Use 'Exchange Type' to group data
      if (!collections[schemaName]) {
        collections[schemaName] = [];
      }
      collections[schemaName].push(data); // Group data by exchange type
    });

    const savePromises = Object.keys(collections).map(async (schemaName) => {
      const model = getModel(schemaName, {}); // Get model for each exchange type
      await model.insertMany(collections[schemaName]); // Insert data for each exchange type
    });

    await Promise.all(savePromises);
    cleanup(filePath); // Cleanup uploaded file after processing

    return {
      code: HttpStatus.ACCEPTED,
      data: collections,
      message: 'Data saved to MongoDB successfully.'
    };
  } catch (error) {
    console.error('Error saving data to MongoDB:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something Went Wrong'
    };
  }
};

export const getAllAsset = async () => {
  try {
    const data = await Asset.find();

    return {
      code: HttpStatus.OK,
      data: data,
      message: 'Assets fetched successful'
    };
  } catch (err) {
    return {
      code: HttpStatus.EXPECTATION_FAILED,
      data: null,
      message: `Something went wrong take refernce from error message below:
                  ${err}`
    };
  }
};

export const getAllTimeZone = async (collectionName) => {
  try {
    const model = getModel(collectionName, {}); // Getting the dynamic model

    const results = await model.find().exec(); // Querying the database

    return {
      code: HttpStatus.OK,
      data: results,
      message: 'Data retrieved successfully.'
    };
  } catch (error) {
    console.error('Error retrieving data from MongoDB:', error);
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: [],
      message: 'Something Went Wrong'
    };
  }
};
