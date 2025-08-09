const express = require('express')
const User = require('../models/User')
const bcrypt = require('bcrypt')
const router = express.Router()

router.get('/auth/register', (req, res) => {
  res.render('register', { csrfToken: req.csrfToken() })
})

router.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body
    // User model will automatically hash the password using bcrypt
    await User.create({ username, password })
    res.redirect('/auth/login')
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      return res.status(409).send('Username already exists.')
    }
    console.error('Registration error:', error)
    console.error(error.stack) // Logging the full error stack for better debugging
    res.status(500).send(error.message)
  }
})

router.get('/auth/login', (req, res) => {
  res.render('login', { csrfToken: req.csrfToken() })
})

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(400).send('User not found')
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (isMatch) {
      req.session.userId = user._id
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
