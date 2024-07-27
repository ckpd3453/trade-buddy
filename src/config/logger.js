import winston, { format } from 'winston';
import 'winston-daily-rotate-file';

/**
 * Logger handles all logs in the application
 */
const logger = winston.createLogger({
  format: format.combine(format.timestamp(), format.simple()),
  transports: [
    new winston.transports.Console({
      level: 'error',
      handleExceptions: true
    }),
    new winston.transports.Console({
      level: 'info',
      handleExceptions: true
    }),
    new winston.transports.Console({
      level: 'debug',
      handleExceptions: true
    })
  ]
});

/**
 * morganLogger logs all http request in a dedicated file and on console
 */
const morganLogger = winston.createLogger({
  format: format.combine(format.simple()),
  transports: [
    new winston.transports.Console({
      level: 'debug',
      handleExceptions: true
    })
  ]
});

export const logStream = {
  /**
   * A writable stream for winston logger.
   *
   * @param {any} message
   */
  write(message) {
    morganLogger.info(message.toString());
  }
};

export default logger;
