const rateLimit = require('express-rate-limit');

// A do-nothing middleware for the test environment
const disabledLimiter = (req, res, next) => {
    next();
};

// Rate limiter for authentication routes. Disabled if NODE_ENV is 'test' or if the specific DISABLE_RATE_LIMITING flag is set.
const authLimiter = process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMITING === 'true'
    ? disabledLimiter
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, // Limit each IP to 20 requests per windowMs
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        message: 'Too many requests from this IP, please try again after 15 minutes',
    });

module.exports = {
    authLimiter,
};
