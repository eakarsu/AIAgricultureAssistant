const { body, query, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const authValidators = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').optional().trim().isLength({ max: 255 }),
    handleValidation
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidation
  ],
  forgotPassword: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    handleValidation
  ],
  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    handleValidation
  ],
  updateProfile: [
    body('name').optional().trim().isLength({ max: 255 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('farm_name').optional().trim(),
    body('farm_size').optional().isNumeric(),
    body('location').optional().trim(),
    body('bio').optional().trim(),
    handleValidation
  ]
};

const cropDiseaseValidators = {
  create: [
    body('crop_name').notEmpty().trim().withMessage('Crop name is required'),
    body('symptoms').optional().trim(),
    body('severity').optional().isIn(['mild', 'moderate', 'severe', 'unknown']),
    body('location').optional().trim(),
    handleValidation
  ]
};

const irrigationValidators = {
  create: [
    body('field_name').notEmpty().trim().withMessage('Field name is required'),
    body('crop_type').optional().trim(),
    body('field_size').optional().isNumeric(),
    body('current_moisture').optional().isNumeric(),
    body('target_moisture').optional().isNumeric(),
    handleValidation
  ]
};

const harvestValidators = {
  create: [
    body('field_name').notEmpty().trim().withMessage('Field name is required'),
    body('crop_type').notEmpty().trim().withMessage('Crop type is required'),
    body('field_size').optional().isNumeric(),
    body('planting_date').optional().isISO8601(),
    handleValidation
  ]
};

const pestValidators = {
  create: [
    body('affected_crop').notEmpty().trim().withMessage('Affected crop is required'),
    body('symptoms').optional().trim(),
    body('severity').optional().isIn(['mild', 'moderate', 'severe']),
    handleValidation
  ]
};

const soilValidators = {
  create: [
    body('field_name').notEmpty().trim().withMessage('Field name is required'),
    body('ph_level').optional().isFloat({ min: 0, max: 14 }),
    body('nitrogen_level').optional().isNumeric(),
    body('phosphorus_level').optional().isNumeric(),
    body('potassium_level').optional().isNumeric(),
    handleValidation
  ]
};

const feedbackValidators = {
  create: [
    body('type').notEmpty().isIn(['bug', 'feature', 'general', 'improvement']).withMessage('Valid feedback type is required'),
    body('subject').notEmpty().trim().withMessage('Subject is required'),
    body('message').notEmpty().trim().withMessage('Message is required'),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    handleValidation
  ]
};

const searchValidators = [
  query('q').notEmpty().trim().withMessage('Search query is required'),
  handleValidation
];

const paginationValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidation
];

module.exports = {
  authValidators,
  cropDiseaseValidators,
  irrigationValidators,
  harvestValidators,
  pestValidators,
  soilValidators,
  feedbackValidators,
  searchValidators,
  paginationValidators,
  handleValidation
};
