const JobEvent = require('../models/JobEvent');
const { getQueue, getConnection } = require('./queueService');
const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const User = require('../models/User');

const KNOWN_QUEUES = ['default', 'emails', 'webhooks', 'sms', 'maintenance'];
const FAILED_JOBS_THRESHOLD = 10;

const handleCheckSystemHealth = async (job) => {
  console.log('Running system health check...');
  const emailQueue = getQueue('emails');
  const redis = getConnection();

  for (const queueName of KNOWN_QUEUES) {
    const queue = getQueue(queueName);
    const failedCount = await queue.getFailedCount();
    const cooldownKey = `alert:cooldown:${queueName}`;

    if (failedCount > FAILED_JOBS_THRESHOLD) {
      const onCooldown = await redis.get(cooldownKey);
      if (onCooldown) {
        console.log(`Alert for queue "${queueName}" is on cooldown. Skipping.`);
        continue;
      }

      console.log(`ALERT: Queue "${queueName}" has ${failedCount} failed jobs, exceeding threshold of ${FAILED_JOBS_THRESHOLD}.`);

      const organizations = await Organization.find({}).select('_id');
      const orgIds = organizations.map(o => o._id);

      const memberships = await Membership.find({
        organization: { $in: orgIds },
        role: 'Owner'
      }).populate('user');

      const ownerEmails = memberships.map(m => m.user.email).filter(Boolean);
      const uniqueOwnerEmails = [...new Set(ownerEmails)];

      for (const email of uniqueOwnerEmails) {
          const alertPayload = {
              recipient: email,
              subject: `[System Alert] High number of failed jobs in ${queueName} queue`,
              queueName: queueName,
              failedCount: failedCount,
              threshold: FAILED_JOBS_THRESHOLD,
          };
          await emailQueue.add('send_system_alert', alertPayload);
          console.log(`Enqueued system alert email to ${email} for ${queueName} queue.`);
      }

      // Set a 1-hour cooldown to prevent spamming
      await redis.set(cooldownKey, 'true', 'EX', 3600);
    }
  }
};

const handlePurgeOldJobEvents = async (job) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  console.log(`Purging job events older than ${thirtyDaysAgo.toISOString()}`);

  const result = await JobEvent.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

  console.log(`Purged ${result.deletedCount} old job events.`);
};

const processor = async (job) => {
  console.log(`Processing maintenance job #${job.id} with name ${job.name}`);

  switch (job.name) {
    case 'purge_old_job_events':
      await handlePurgeOldJobEvents(job);
      break;
    case 'check_system_health':
      await handleCheckSystemHealth(job);
      break;
    default:
      console.log(`No handler for maintenance job name: ${job.name}`);
  }
};

module.exports = processor;
