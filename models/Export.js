const mongoose = require('mongoose');

const exportSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  form: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeedbackForm',
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  filePath: {
    type: String, // Path to the generated file on the server
  },
  error: {
    type: String, // To store error messages on failure
  }
}, { timestamps: true });

const Export = mongoose.model('Export', exportSchema);

module.exports = Export;
