const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    enum: ['text', 'multipleChoice', 'checkbox', 'rating'],
    required: true
  }
});

const feedbackFormSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  questions: {
    type: [questionSchema],
    validate: [arrayLimit, '{PATH} requires at least one question']
  },
  creationDate: {
    type: Date,
    default: Date.now
  }
});

function arrayLimit(val) {
  return val.length > 0;
}

feedbackFormSchema.pre('save', function(next) {
  if (!this.questions || this.questions.length < 1) {
    const err = new Error('Feedback form must have at least one question.');
    console.error('Error saving feedback form:', err);
    next(err);
  } else {
    console.log('Feedback form saved successfully.');
    next();
  }
});

const FeedbackForm = mongoose.model('FeedbackForm', feedbackFormSchema);

module.exports = FeedbackForm;