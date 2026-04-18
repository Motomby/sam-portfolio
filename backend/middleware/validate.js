const { body, validationResult } = require('express-validator');

/**
 * Validation rules for the contact/chat form submission
 */
const contactValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters')
    .escape(), // strips HTML tags to prevent XSS

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 5, max: 2000 }).withMessage('Message must be between 5 and 2000 characters')
    .escape(),

  body('source')
    .optional()
    .isIn(['contact', 'chat']).withMessage('Source must be "contact" or "chat"'),
];

/**
 * Middleware that checks validation results and returns errors if any
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Middleware to verify the Admin API key for protected routes
 */
const requireAdminKey = (req, res, next) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized — invalid or missing admin key',
    });
  }
  next();
};

module.exports = { contactValidationRules, handleValidationErrors, requireAdminKey };
