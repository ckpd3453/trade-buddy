import Joi from '@hapi/joi';

export const newTradeValidator = (req, res, next) => {
  const schema = Joi.object({
    market: Joi.string().min(2).required().messages({
      'string.base': 'Market should be a type of text',
      'string.empty': 'Please Enter Market',
      'string.min': 'Market should have a minimum length of 2',
      'any.required': 'Please Enter Market'
    }),
    instrument: Joi.string().min(2).required().messages({
      'string.base': 'Instrument should be a type of text',
      'string.empty': 'Please Enter Instrument',
      'string.min': 'Instrument should have a minimum length of 2',
      'any.required': 'Please Enter Instrument'
    }),
    exchange: Joi.string().min(2).required().messages({
      'string.base': 'Exchange should be a type of text',
      'string.empty': 'Please Enter Exchange',
      'string.min': 'Exchange should have a minimum length of 2',
      'any.required': 'Please Enter Exchange'
    }),
    broker: Joi.string().required(),
    marketAssessment: Joi.string().optional(),
    tradeStrategy: Joi.string().optional(),
    assetName: Joi.string().optional(),
    tradeType: Joi.string().optional(),
    stopLoss: Joi.number().optional(),
    entryDate: Joi.date().required().messages({
      'date.base': 'Please Enter Trade Entry Date',
      'any.required': 'Please Enter Trade Entry Date'
    }),
    entryTradeMonth: Joi.string().optional(),
    entryTradeWeek: Joi.string().optional(),
    entryTime: Joi.string().required().messages({
      'string.base': 'Entry Time should be a type of text',
      'string.empty': 'Please Enter Trade Entry Time',
      'any.required': 'Please Enter Trade Entry Time'
    }),
    strikePrice: Joi.number().optional(),
    entryQuantity: Joi.number().required().messages({
      'number.base': 'Trade quantity should be a number',
      'any.required': 'Please Enter trade quantity purchased.'
    }),
    tradeStatus: Joi.string().optional(),
    brokerage: Joi.number().optional(),
    cmp: Joi.number().optional(),
    openQuantity: Joi.number().optional(),
    expiry: Joi.date().optional(),
    entryPrice: Joi.number().required().messages({
      'number.base': 'Entry Price should be a number',
      'any.required': 'Please Enter Trade Entry Price'
    }),
    exit: Joi.alternatives()
      .try(
        Joi.object({
          // Validation schema for a single exit object
          exitId: Joi.string().optional(),
          exitDate: Joi.date().optional(),
          exitTime: Joi.string().optional(),
          quantity: Joi.number().required(),
          price: Joi.number().required()
        }),
        Joi.array().items(
          Joi.object({
            // Validation schema for an array of exit objects
            exitId: Joi.string().optional(),
            exitDate: Joi.date().optional(),
            exitTime: Joi.string().optional(),
            quantity: Joi.number().required(),
            price: Joi.number().required()
          })
        )
      )
      .optional(), // Need to ask
    numOfLots: Joi.number().optional(),
    lotSize: Joi.number().optional(),
    profitClosed: Joi.number().optional(),
    profitOpen: Joi.number().optional(),
    isGrouped: Joi.boolean().default(false).optional(),
    remarks: Joi.string().allow('').optional(),
    futureOptions: Joi.string().allow('').optional()
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  } else {
    req.validatedBody = value;
    next();
  }
};
