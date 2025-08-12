const { getQueue } = require('./queueService');

const initScheduler = async () => {
  console.log('Initializing job scheduler...');
  const maintenanceQueue = getQueue('maintenance');

  // Remove any existing repeatable jobs to avoid duplicates on restart
  const repeatableJobs = await maintenanceQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await maintenanceQueue.removeRepeatableByKey(job.key);
  }

  // Schedule a job to purge old job events every day at midnight
  await maintenanceQueue.add(
    'purge_old_job_events',
    {}, // No payload needed for this job
    {
      repeat: {
        cron: '0 0 * * *', // Every day at midnight
      },
      jobId: 'nightly-job-event-purge', // A unique ID for this repeatable job
    }
  );

  await maintenanceQueue.add(
    'check_system_health',
    {},
    {
      repeat: {
        every: 300000, // Every 5 minutes (in milliseconds)
      },
      jobId: 'periodic-health-check',
    }
  );

  console.log('Job scheduler initialized. "purge_old_job_events" and "check_system_health" jobs scheduled.');
};

module.exports = { initScheduler };
