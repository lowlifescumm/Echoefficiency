const JobEvent = require('../models/JobEvent');

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
    default:
      console.log(`No handler for maintenance job name: ${job.name}`);
  }
};

module.exports = processor;
