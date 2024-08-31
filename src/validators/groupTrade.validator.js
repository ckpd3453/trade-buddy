import Joi from '@hapi/joi';

export const newGroupTradeValidator = (req, res, next) => {
  const schema = Joi.object({
    groupName: Joi.string().min(2).required(),
    trades: Joi.array().items(Joi.string().optional()).optional()
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  } else {
    req.validatedBody = value;
    next();
  }
};
