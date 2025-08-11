const express = require('express');
const router = express.Router();

// @route   GET /password/forgot
// @desc    Render the forgot password form
// @access  Public
router.get('/forgot', (req, res) => {
  res.render('forgot-password', {
    csrfToken: req.csrfToken()
  });
});

const User = require('../models/User');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// @route   POST /password/forgot
// @desc    Handle the forgot password form submission
// @access  Public
router.post('/forgot', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      // Generate token
      const token = crypto.randomBytes(20).toString('hex');

      // Set token and expiry on user model
      user.passwordResetToken = token;
      user.passwordResetExpires = Date.now() + 3600000; // 1 hour

      await user.save();

      const resetURL = `http://${req.headers.host}/password/reset/${token}`;

      // If email is configured, send email. Otherwise, log to console.
      if (process.env.EMAIL_HOST) {
        const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please click on the following link, or paste this into your browser to complete the process:\n\n${resetURL}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`;
        try {
          await sendEmail({
            to: user.email,
            subject: 'Password Reset Token',
            text: message,
          });
          req.flash('success', 'An email has been sent with password reset instructions.');
        } catch (err) {
          console.error('Email sending error:', err);
          user.passwordResetToken = undefined;
          user.passwordResetExpires = undefined;
          await user.save({ validateBeforeSave: false });
          req.flash('error', 'There was an error sending the email. Please try again later.');
        }
      } else {
        console.log('--- PASSWORD RESET (NO EMAIL CONFIGURED) ---');
        console.log(`Reset link for ${user.email}: ${resetURL}`);
        console.log('-------------------------------------------');
        req.flash('success', 'Password reset link generated (see console).');
      }
    }

    // To prevent user enumeration, we redirect to the same page with a generic message
    // even if the user wasn't found. The flash message is set inside the try/catch blocks.
    if (!req.flash('success').length && !req.flash('error').length) {
      req.flash('success', 'If your email is registered, you will receive a password reset link.');
    }
    res.redirect('/auth/login');

  } catch (error) {
    console.error('Forgot password error:', error);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/password/forgot');
  }
});

// @route   GET /password/reset/:token
// @desc    Render the reset password form
// @access  Public
router.get('/reset/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      passwordResetToken: req.params.token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/password/forgot');
    }

    res.render('reset-password', {
      token: req.params.token,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error('Reset password GET error:', error);
    req.flash('error', 'An error occurred.');
    res.redirect('/password/forgot');
  }
});

// @route   POST /password/reset/:token
// @desc    Handle the reset password form submission
// @access  Public
router.post('/reset/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      passwordResetToken: req.params.token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/password/forgot');
    }

    if (req.body.password !== req.body.confirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect(`/password/reset/${req.params.token}`);
    }

    // Set the new password
    user.password = req.body.password;
    // Clear the reset token fields
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    req.flash('success', 'Your password has been updated successfully. Please log in.');
    res.redirect('/auth/login');

  } catch (error) {
    console.error('Reset password POST error:', error);
    req.flash('error', 'An error occurred.');
    res.redirect('/password/forgot');
  }
});

module.exports = router;
