const mongoose = require('mongoose');

const feedbackSubmissionSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeedbackForm',
    required: true
  },
  feedback: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

feedbackSubmissionSchema.pre('save', function(next) {
  console.log('Saving feedback submission for form ID:', this.formId);
  if (!this.feedback || Object.keys(this.feedback).length === 0) {
    const err = new Error('Feedback submission must include feedback.');
    console.error('Error saving feedback submission:', err);
    next(err);
  } else {
    console.log('Feedback submission validation passed.');
    next();
  }
});

const FeedbackSubmission = mongoose.model('FeedbackSubmission', feedbackSubmissionSchema);

module.exports = FeedbackSubmission;