const mongoose = require('mongoose')

const feedbackSubmissionSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeedbackForm',
    required: true
  },
  responses: {
    type: Map,
    of: String,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
})

feedbackSubmissionSchema.pre('save', function (next) {
  console.log('Saving feedback submission for form ID:', this.formId)
  if (!this.responses || this.responses.size === 0) {
    const err = new Error('Feedback submission must include responses.')
    console.error('Error saving feedback submission:', err)
    next(err)
  } else {
    console.log('Feedback submission validation passed.')
    next()
  }
})

const FeedbackSubmission = mongoose.model('FeedbackSubmission', feedbackSubmissionSchema)

module.exports = FeedbackSubmission
