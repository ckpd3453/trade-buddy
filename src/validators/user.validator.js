import Joi from '@hapi/joi';

export const newUserValidator = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string().min(4).required(),
    lastName: Joi.string().required(),
    email: Joi.string()
      .email()
      .pattern(
        /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)$/
      )
      .required(),
    password: Joi.string()
      .min(8)
      .max(30)
      .pattern(new RegExp('(?=.*[a-z])')) // At least one lowercase letter
      .pattern(new RegExp('(?=.*[A-Z])')) // At least one uppercase letter
      .pattern(new RegExp('(?=.*[0-9])')) // At least one number
      .pattern(new RegExp('(?=.*[!@#$%^&*])')) // At least one special character
      .required()
      .messages({
        'string.pattern.base':
          'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must not exceed 30 characters'
      }),
    country: Joi.string().min(3).optional(),
    phoneNumber: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .required()
      .messages({
        'string.empty': 'Phone number cannot be empty',
        'string.pattern.base': 'Phone number must be a 10-digit number'
      })
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  } else {
    req.validatedBody = value;
    next();
  }
};
