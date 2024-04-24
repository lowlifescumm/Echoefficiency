// Load environment variables
require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const csrf = require('csurf'); // Added for CSRF protection
const flash = require('connect-flash'); // Added for flash messages
const authRoutes = require("./routes/authRoutes");
const feedbackRoutes = require('./routes/feedbackRoutes'); // Added feedbackRoutes
const feedbackSubmissionRoutes = require('./routes/feedbackSubmissionRoutes'); // Added feedbackSubmissionRoutes
const paymentRoutes = require('./routes/paymentRoutes'); // Added paymentRoutes

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET || !process.env.STRIPE_SECRET_KEY) {
  console.error("Error: config environment variables not set. Please create/edit .env configuration file.");
  process.exit(-1);
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Setting the templating engine to EJS
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));

// Database connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.error(`Database connection error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });

// Session configuration with connect-mongo
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
  }),
);

// Initialize flash middleware
app.use(flash());

// CSRF protection middleware
app.use(csrf());

// Middleware to make the csrfToken and flash messages available to all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.successMsg = req.flash('success');
  res.locals.errorMsg = req.flash('error');
  next();
});

app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

// Logging session creation and destruction
app.use((req, res, next) => {
  const sess = req.session;
  // Make session available to all views
  res.locals.session = sess;
  if (!sess.views) {
    sess.views = 1;
    console.log("Session created at: ", new Date().toISOString());
  } else {
    sess.views++;
    console.log(
      `Session accessed again at: ${new Date().toISOString()}, Views: ${sess.views}, User ID: ${sess.userId || '(unauthenticated)'}`,
    );
  }
  console.log(`Session ID: ${req.sessionID}`); // Log the session ID for debugging
  next();
});

// Authentication Routes
app.use(authRoutes);

// Feedback Routes
app.use(feedbackRoutes); // Using feedbackRoutes

// Feedback Submission Routes
app.use(feedbackSubmissionRoutes); // Using feedbackSubmissionRoutes

// Payment Routes
app.use(paymentRoutes); // Using paymentRoutes

// Root path response
app.get("/", (req, res) => {
  res.render("index");
});

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});