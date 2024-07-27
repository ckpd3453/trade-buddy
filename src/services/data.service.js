const getModel = require('../models/data.model');
import HttpStatus from 'http-status-codes';
import { cleanup, parseCSV } from '../utils/data.util';

export const uploadCSVData = async (filePath) => {
  try {
    const results = await parseCSV(filePath);

    const collections = {};
    results.forEach((row) => {
      const { collectionName, ...data } = row;
      if (!collections[collectionName]) {
        collections[collectionName] = [];
      }
      collections[collectionName].push(data);
    });

    const savePromises = Object.keys(collections).map(
      async (collectionName) => {
        const model = getModel(collectionName, {});
        await model.insertMany(collections[collectionName]);
      }
    );

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
