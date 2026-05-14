const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

// AI-specific rate limiter: 20 AI requests per user per hour
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => {
    // Use user id if authenticated, else normalized IP
    return (req.user && req.user.id) ? `user_${req.user.id}` : ipKeyGenerator(req);
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Limit is 20 per hour.', code: 'RATE_LIMITED' }
});

module.exports = { generalLimiter, authLimiter, aiLimiter };
