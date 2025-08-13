const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const csrf = require('csurf')
const flash = require('connect-flash')
const helmet = require('helmet');
const compression = require('compression');
const authRoutes = require('./routes/authRoutes')
const feedbackRoutes = require('./routes/feedbackRoutes')
const feedbackSubmissionRoutes = require('./routes/feedbackSubmissionRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const passwordResetRoutes = require('./routes/passwordResetRoutes')
const organizationRoutes = require('./routes/organizationRoutes')
const webhookRoutes = require('./routes/webhookRoutes')
const monitoringRoutes = require('./routes/monitoringRoutes')
const surveyRoutes = require('./routes/surveyRoutes')
const Membership = require('./models/Membership');

const app = express()

// Security Middleware
app.use(
  helmet({
    hsts: process.env.NODE_ENV === 'production' ? {
        maxAge: 31536000,
        includeSubDomains: true,
    } : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "blob:", "https://www.googletagmanager.com", "https://cdn.jsdelivr.net/npm/chart.js", "https://cdn.jsdelivr.net", "https://code.jquery.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "https:"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'self'"]
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// The Permissions-Policy header is not a top-level function in this version of Helmet.
// It is enabled by default with a reasonable set of permissions.
// The custom policy will be set via a separate middleware if needed, but for now, we remove the failing call.

// Compress all responses
app.use(compression());

// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Setting the templating engine to EJS
app.set('view engine', 'ejs')

// Serve static files
app.use(express.static('public'))

// Session configuration
let sessionConfig
if (process.env.NODE_ENV === 'test') {
  sessionConfig = {
    secret: 'test-secret',
    resave: false,
    saveUninitialized: true // In-memory store for tests
  }
} else {
  if (!process.env.SESSION_SECRET || !process.env.DATABASE_URL) {
    // In a real app, you'd want to handle this more gracefully
    throw new Error('SESSION_SECRET and DATABASE_URL must be set in the environment')
  }
  sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    },
  }
}
app.use(session(sessionConfig))

// Initialize flash middleware
app.use(flash())

// CSRF protection middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(csrf())
}

// Middleware to make variables available to all views
app.use(async (req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    res.locals.csrfToken = req.csrfToken()
  } else {
    // Mock CSRF token for tests
    res.locals.csrfToken = 'test-csrf-token'
  }
  res.locals.successMsg = req.flash('success');
  res.locals.errorMsg = req.flash('error');
  res.locals.session = req.session;

  // Add userRole to locals if authenticated
  if (req.session.userId) {
    try {
      const membership = await Membership.findOne({ user: req.session.userId }).select('role');
      if (membership) {
        res.locals.userRole = membership.role;
      }
    } catch (error) {
      console.error('Error fetching user role for views:', error);
    }
  }

  next();
});

// Silence console logs in test environment
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const sess = req.session
    if (!sess.views) {
      sess.views = 1
      console.log('Session created at: ', new Date().toISOString())
    } else {
      sess.views++
      console.log(
        `Session accessed again at: ${new Date().toISOString()}, Views: ${sess.views}, User ID: ${sess.userId || '(unauthenticated)'}`
      )
    }
    console.log(`Session ID: ${req.sessionID}`)
    next()
  })
}

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use(authRoutes)
app.use(feedbackRoutes)
app.use(feedbackSubmissionRoutes)
app.use(paymentRoutes)
app.use('/password', passwordResetRoutes)
app.use('/organization', organizationRoutes)
app.use('/webhooks', webhookRoutes)
app.use('/monitoring', monitoringRoutes)
app.use(surveyRoutes)

app.get('/subscribe', (req, res) => {
  res.render('subscribe', { STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY })
})

app.get('/', (req, res) => {
  res.render('index')
})

// 404 handler
app.use((req, res, next) => {
  res.status(404).send('Page not found.')
})

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`)
  console.error(err.stack)
  res.status(500).send('There was an error serving your request.')
})

module.exports = app
