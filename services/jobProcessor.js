const fs = require('fs/promises');
const path = require('path');
const { createObjectCsvStringifier } = require('csv-writer');
const JobEvent = require('../models/JobEvent');
const Export = require('../models/Export');
const FeedbackSubmission = require('../models/FeedbackSubmission');
const AuditLog = require('../models/AuditLog');

const handleExportGenerate = async (job) => {
    const { exportId, formId, userId, organizationId } = job.data;
    console.log(`Starting export generate job for exportId: ${exportId}`);

    try {
        // 1. Mark export as processing
        await Export.findByIdAndUpdate(exportId, { status: 'processing' });

        // 2. Fetch submissions
        const submissions = await FeedbackSubmission.find({ formId }).lean();
        if (submissions.length === 0) {
            await Export.findByIdAndUpdate(exportId, { status: 'completed', filePath: null });
            console.log(`No submissions found for form ${formId}. Export marked as complete.`);
            return;
        }

        // 3. Generate CSV content
        const responseKeys = Object.keys(submissions[0].responses);
        const headers = [
            { id: 'submittedAt', title: 'Submitted At' },
            ...responseKeys.map(key => ({ id: key, title: key })),
        ];
        const csvStringifier = createObjectCsvStringifier({ header: headers });
        const records = submissions.map(sub => ({
            submittedAt: sub.submittedAt.toISOString(),
            ...sub.responses,
        }));
        const csvData = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

        // 4. Save file to a temporary directory
        const exportsDir = path.join(__dirname, '..', 'tmp', 'exports');
        await fs.mkdir(exportsDir, { recursive: true });
        const filePath = path.join(exportsDir, `${exportId}.csv`);
        await fs.writeFile(filePath, csvData);

        // 5. Update export record with file path and completed status
        await Export.findByIdAndUpdate(exportId, { status: 'completed', filePath });

        // 6. Create audit log entry
        await AuditLog.create({
            user: userId,
            organization: organizationId,
            action: 'export_csv',
            details: { formId, exportId }
        });

        console.log(`Successfully generated export file: ${filePath}`);

    } catch (error) {
        console.error(`Failed to process export job for exportId ${exportId}:`, error);
        // Mark export as failed in the DB
        await Export.findByIdAndUpdate(exportId, { status: 'failed', error: error.message });
        throw error; // Re-throw to allow BullMQ to handle retries
    }
};

const processor = async (job) => {
  console.log(`Processing job #${job.id} with name ${job.name}`);
  const { idempotencyKey } = job.data;

  if (!idempotencyKey) {
    console.error(`Job #${job.id} is missing an idempotency key. Skipping.`);
    return;
  }

  // Idempotency Check
  try {
    await JobEvent.create({
      idempotencyKey,
      jobId: job.id,
      queueName: job.queueName,
      status: 'processing',
    });
  } catch (error) {
    if (error.code === 11000) {
      console.log(`Job with idempotency key ${idempotencyKey} already processed. Skipping.`);
      return;
    }
    throw error;
  }

  // Route to the correct handler based on job name
  try {
    switch (job.name) {
        case 'export_generate':
            await handleExportGenerate(job);
            break;
        default:
            console.log(`No handler for job name: ${job.name}`);
    }
    await JobEvent.findOneAndUpdate({ idempotencyKey }, { status: 'completed' });
  } catch (error) {
    await JobEvent.findOneAndUpdate({ idempotencyKey }, { status: 'failed' });
    throw error;
  }
};

module.exports = processor;
