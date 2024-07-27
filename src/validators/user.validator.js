import Joi from '@hapi/joi';

export const newUserValidator = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string().min(4).required(),
    lastName: Joi.string().required(),
    email: Joi.string()
      .email()
      .pattern(
        /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)$/
      ),
    password: Joi.string()
      .min(8)
      .max(30)
      .pattern(new RegExp('(?=.*[a-z])')) // At least one lowercase letter
      .pattern(new RegExp('(?=.*[A-Z])')) // At least one uppercase letter
      .pattern(new RegExp('(?=.*[0-9])')) // At least one number
      .pattern(new RegExp('(?=.*[!@#$%^&*])')) // At least one special character
      .required(),
    country: Joi.string().min(3).required(),
    timeZone: Joi.string().min(3).required(),
    dateFormat: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .messages({
        'string.pattern.base': `Date format must be 'YYYY-MM-DD'`
      }),
    timeFormat: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
      .messages({
        'string.pattern.base': `Time format must be 'HH:mm:ss'`
      }),
    accountName: Joi.object().optional()
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    next(error);
  } else {
    req.validatedBody = value;
    next();
  }
};
