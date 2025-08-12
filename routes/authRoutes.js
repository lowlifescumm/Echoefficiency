const express = require('express')
const User = require('../models/User')
const bcrypt = require('bcrypt')
const router = express.Router()
const { authLimiter } = require('./middleware/rateLimitMiddleware');

router.get('/auth/register', (req, res) => {
  res.render('register', { csrfToken: req.csrfToken() })
})

const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const { getQueue } = require('../services/queueService');

router.post('/auth/register', authLimiter, async (req, res) => {
  let newUser;
  try {
    const { username, email, password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).send('Password must be at least 8 characters long.');
    }

    // 1. Create the user
    newUser = await User.create({ username, email, password });

    // 2. Create an organization for the user
    const organization = await Organization.create({
      name: `${username}'s Organization`,
      owner: newUser._id,
    });

    // 3. Create the membership linking the user and organization
    await Membership.create({
      user: newUser._id,
      organization: organization._id,
      role: 'Owner',
    });

    // 4. Set the user's current organization
    newUser.currentOrganization = organization._id;
    await newUser.save();

    // 5. Enqueue a welcome email job
    try {
        const emailQueue = getQueue('emails');
        await emailQueue.add('send_welcome_email', {
            email: newUser.email,
            username: newUser.username,
        });
        console.log(`Enqueued welcome email for ${newUser.email}`);
    } catch (queueError) {
        // Non-critical error, just log it
        console.error('Failed to enqueue welcome email job:', queueError);
    }

    req.flash('success', 'Registration successful! Please log in.');
    res.redirect('/auth/login');

  } catch (error) {
    // If any step fails, attempt to clean up created documents
    if (newUser) {
      await User.findByIdAndDelete(newUser._id);
      // Note: Also consider deleting the organization if it was created
    }

    if (error.code === 11000) { // Duplicate key error
      if (error.keyPattern.username) {
        return res.status(409).send('Username already exists.');
      } else if (error.keyPattern.email) {
        return res.status(409).send('Email already exists.');
      }
      return res.status(409).send('Username or Email already exists.');
    }
    console.error('Registration error:', error);
    console.error(error.stack);
    res.status(500).send(error.message);
  }
});

router.get('/auth/login', (req, res) => {
  res.render('login', { csrfToken: req.csrfToken() })
})

router.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(400).send('User not found')
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (isMatch) {
      req.session.userId = user._id
      req.session.currentOrganizationId = user.currentOrganization; // Store current org in session
      console.log(`User ${username} logged in successfully. Session ID: ${req.sessionID}`) // Logging the successful login and session ID
      return res.redirect('/')
    } else {
      return res.status(400).send('Password is incorrect')
    }
  } catch (error) {
    console.error('Login error:', error)
    console.error(error.stack) // Logging the full error stack for better debugging
    return res.status(500).send(error.message)
  }
})

router.get('/auth/logout', (req, res) => {
  const sessionId = req.sessionID // Storing session ID for logging before destruction
  req.session.destroy(err => {
    if (err) {
      console.error('Error during session destruction:', err)
      console.error(err.stack) // Logging the full error stack for better debugging
      return res.status(500).send('Error logging out')
    }
    console.log(`Session ${sessionId} destroyed successfully.`) // Logging the successful session destruction
    res.redirect('/auth/login')
  })
})

module.exports = router
