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
  },
  link: {
    type: String
    // Removed the required constraint to allow initial save without the link
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
    if (this.isNew) {
      // Generate the link on the first save
      const domain = process.env.DOMAIN || 'http://echoefficiency.com'; 
      this.link = `${domain}/form/${this._id}`;
      console.log(`Feedback form link generated: ${this.link}`);
    }
    next();
  }
});

feedbackFormSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('There was a duplicate key error'));
  } else {
    next(error);
  }
});

const FeedbackForm = mongoose.model('FeedbackForm', feedbackFormSchema);

module.exports = FeedbackForm;
