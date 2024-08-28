import Joi from '@hapi/joi';

export const newTradingAccountValidator = (req, res, next) => {
  const schema = Joi.object({
    account: Joi.string().min(2).required()
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  } else {
    req.validatedBody = value;
    next();
  }
};
