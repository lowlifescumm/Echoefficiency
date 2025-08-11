const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: ['export_csv', 'user_login', 'user_logout', 'form_created', 'form_deleted'], // Can be expanded
  },
  details: {
    type: Map,
    of: String,
  },
}, { timestamps: { createdAt: 'timestamp' } }); // Use 'timestamp' as the field name for creation

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
