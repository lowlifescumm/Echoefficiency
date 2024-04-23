const express = require('express');
const router = express.Router();
const FeedbackForm = require('../models/FeedbackForm');
const FeedbackSubmission = require('../models/FeedbackSubmission'); // Adjust the path as needed
const { isAuthenticated } = require('./middleware/authMiddleware');

router.post('/create-form', isAuthenticated, async (req, res) => {
  try {
    const { title, questions } = req.body;
    const ownerId = req.session.userId;

    if (!title || !questions || questions.length === 0) {
      console.log('Validation failed: Title and questions are required.');
      return res.status(400).json({ message: 'Validation failed: Title and questions are required.' });
    }

    const isValidQuestions = questions.every(question => question.questionText && question.questionType);
    if (!isValidQuestions) {
      console.log('Validation failed: Each question must include both questionText and questionType.');
      return res.status(400).json({ message: 'Validation failed: Each question must include both questionText and questionType.' });
    }

    const newForm = new FeedbackForm({
      ownerId,
      title,
      questions,
      creationDate: new Date(),
      // Initially, do not set the link field
    });

    // Save the form to generate its unique _id
    await newForm.save();

    // Generate the unique URL for the form using the generated _id
    const formLink = `${req.protocol}://${req.get('host')}/form/${newForm._id.toString()}`;
    newForm.link = formLink;

    // Save the form again with the unique URL
    await newForm.save();

    console.log('Feedback form created successfully:', newForm);
    res.redirect('/success');
  } catch (error) {
    console.error('Failed to create feedback form:', error);
    console.error(error.stack);
    res.status(500).json({ message: 'Failed to create feedback form', error: error.message });
  }
});

router.get('/create-form', isAuthenticated, (req, res) => {
    res.render('createForm', { csrfToken: req.csrfToken() });
});

router.get('/success', isAuthenticated, (req, res) => {
  res.render('success', { message: 'Feedback form created successfully!' });
});

router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const forms = await FeedbackForm.find({ ownerId: req.session.userId }).lean();
    console.log('Fetched feedback forms for dashboard.');
    res.render('dashboard', { forms, csrfToken: req.csrfToken() });
  } catch (error) {
    console.error('Error fetching feedback forms for dashboard:', error);
    console.error(error.stack);
    res.status(500).send('Error fetching feedback forms for dashboard');
  }
});

router.get('/edit-form/:formId', isAuthenticated, async (req, res) => {
  try {
    const form = await FeedbackForm.findById(req.params.formId).lean();
    if (!form) {
      console.log('Feedback form not found');
      return res.status(404).send('Feedback form not found');
    }
    console.log('Rendering edit form page');
    res.render('editForm', { form, csrfToken: req.csrfToken() });
  } catch (error) {
    console.error('Error fetching feedback form for editing:', error);
    console.error(error.stack);
    res.status(500).send('Error fetching feedback form for editing');
  }
});

router.post('/update-form/:formId', isAuthenticated, async (req, res) => {
  try {
    const { title, questions } = req.body;
    await FeedbackForm.findByIdAndUpdate(req.params.formId, { title, questions });
    console.log('Feedback form updated successfully');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error updating feedback form:', error);
    console.error(error.stack);
    res.status(500).send('Error updating feedback form');
  }
});

router.post('/delete-form/:formId', isAuthenticated, async (req, res) => {
  try {
    await FeedbackForm.findByIdAndDelete(req.params.formId);
    console.log('Feedback form deleted successfully');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error deleting feedback form:', error);
    console.error(error.stack);
    res.status(500).send('Error deleting feedback form');
  }
});

router.get('/view-form/:formId', isAuthenticated, async (req, res) => {
  try {
    const form = await FeedbackForm.findById(req.params.formId).lean();
    if (!form) {
      console.log('Feedback form not found for viewing');
      return res.status(404).send('Feedback form not found.');
    }
    console.log(`Rendering view form page for form ID: ${req.params.formId}`);
    res.render('viewForm', { form, csrfToken: req.csrfToken() });
  } catch (error) {
    console.error('Error fetching feedback form for viewing:', error);
    console.error(error.stack);
    res.status(500).send('Error fetching feedback form for viewing.');
  }
});

router.get('/form/:formId', async (req, res) => {
  try {
    const form = await FeedbackForm.findById(req.params.formId).lean();
    if (!form) {
      console.log('Feedback form not found.');
      return res.status(404).send('Feedback form not found.');
    }
    res.render('feedbackForm', { form });
  } catch (error) {
    console.error('Error fetching feedback form:', error);
    console.error(error.stack);
    return res.status(500).send('Error displaying feedback form.');
  }
});

router.post('/submit-feedback', async (req, res) => {
  try {
    const { formId, responses } = req.body; // Assuming the form sends `formId` and `responses`

    const formExists = await FeedbackForm.findById(formId);
    if (!formExists) {
      console.log('Feedback form does not exist.');
      return res.status(404).json({ message: 'Feedback form does not exist.' });
    }

    const newSubmission = new FeedbackSubmission({
      formId,
      responses, // Adjusted to match the expected structure
      submittedAt: new Date(), // Changed to match the schema in FeedbackSubmission.js
    });

    await newSubmission.save();
    console.log('Feedback submitted successfully.');
    res.json({ message: 'Feedback submitted successfully.' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    console.error(error.stack);
    res.status(500).json({ message: 'Error submitting feedback.', error: error });
  }
});

module.exports = router;