const mongoose = require('mongoose');

const jobEventSchema = new mongoose.Schema({
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
  },
  jobId: {
    type: String,
    required: true,
  },
  queueName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['processing', 'completed', 'failed'],
  },
  payload: {
    type: Object,
  },
}, { timestamps: true });

const JobEvent = mongoose.model('JobEvent', jobEventSchema);

module.exports = JobEvent;
