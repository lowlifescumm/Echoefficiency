const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const csrf = require('csurf')
const flash = require('connect-flash')
const authRoutes = require('./routes/authRoutes')
const feedbackRoutes = require('./routes/feedbackRoutes')
const feedbackSubmissionRoutes = require('./routes/feedbackSubmissionRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const passwordResetRoutes = require('./routes/passwordResetRoutes')
const organizationRoutes = require('./routes/organizationRoutes')
const webhookRoutes = require('./routes/webhookRoutes')

const app = express()

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
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL })
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
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    res.locals.csrfToken = req.csrfToken()
  } else {
    // Mock CSRF token for tests
    res.locals.csrfToken = 'test-csrf-token'
  }
  res.locals.successMsg = req.flash('success')
  res.locals.errorMsg = req.flash('error')
  res.locals.session = req.session
  next()
})

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

// Routes
app.use(authRoutes)
app.use(feedbackRoutes)
app.use(feedbackSubmissionRoutes)
app.use(paymentRoutes)
app.use('/password', passwordResetRoutes)
app.use('/organization', organizationRoutes)
app.use('/webhooks', webhookRoutes)

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
