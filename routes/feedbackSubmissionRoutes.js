const express = require('express');
const router = express.Router();
const FeedbackForm = require('../models/FeedbackForm');
const FeedbackSubmission = require('../models/FeedbackSubmission');
const { isAuthenticated } = require('./middleware/authMiddleware');

// Route to handle feedback form submission
router.post('/submit-feedback', async (req, res) => {
  console.log('Received feedback submission:', req.body);
  try {
    const { formId, _csrf, ...feedbackData } = req.body; // Destructure to separate formId, CSRF token, and feedback data

    // Check if feedbackData has at least one question answered
    if (!formId || Object.keys(feedbackData).length === 0) {
      console.log('Validation failed: formId and at least one feedback response are required.');
      return res.status(400).send('Validation failed: formId and at least one feedback response are required.');
    }

    // Find the feedback form by formId
    const form = await FeedbackForm.findById(formId);
    if (!form) {
      console.log(`Feedback form with ID ${formId} not found.`);
      return res.status(404).send('Feedback form not found.');
    }

    // Save feedback to the database
    const newFeedbackSubmission = new FeedbackSubmission({
      formId: formId,
      feedback: feedbackData,
      submittedAt: new Date()
    });
    await newFeedbackSubmission.save();

    console.log(`Feedback for form ID ${formId} saved successfully.`);
    // Redirect to a success page with a success message
    req.flash('success', 'Feedback submitted successfully.');
    res.redirect('/feedback-success'); // Assuming a route '/feedback-success' exists to handle this redirection
  } catch (error) {
    console.error('Error submitting feedback:', error);
    console.error(error.stack);
    res.status(500).send('Error submitting feedback.');
  }
});

// Route to handle the feedback submission success page
router.get('/feedback-success', isAuthenticated, (req, res) => {
  const successMsg = req.flash('success');
  if (successMsg.length > 0) {
    res.render('feedbackSuccess', { message: successMsg[0] }); // Assuming a view 'feedbackSuccess.ejs' exists
  } else {
    // Redirect to the dashboard if there's no success message, indicating direct access to this route without submission
    res.redirect('/dashboard');
  }
});

module.exports = router;