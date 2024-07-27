import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
const swaggerUI = require('swagger-ui-express');
const swaggerUiDoc = require('../src/swagger/SwaggerUI.json');

import routes from './routes';
import database from './config/database';
import {
  appErrorHandler,
  genericErrorHandler,
  notFound
} from './middlewares/error.middleware';
import logger, { logStream } from './config/logger';

import morgan from 'morgan';

const app = express();
// const host = process.env.APP_HOST || 'http://localhost';
const port = process.env.APP_PORT || 3000;
const api_version = process.env.API_VERSION || 'v1';

app.use(cors());
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('combined', { stream: logStream }));

database();

app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerUiDoc));
app.use(`/api/${api_version}`, routes());
app.use(appErrorHandler);
app.use(genericErrorHandler);
app.use(notFound);

app.listen(port, () => {
  // logger.info(`Server started at ${host}:${port}/api/${api_version}/`);
  logger.info(`Server started at on vercel:${port}/api/${api_version}/`);
});

export default app;
