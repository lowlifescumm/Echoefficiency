const sendEmail = require('../utils/sendEmail');
const fs = require('fs/promises');
const path = require('path');
const ejs = require('ejs');

const handleSendWelcomeEmail = async (job) => {
  const { email, username } = job.data;
  console.log(`Sending welcome email to ${email}`);

  const templatePath = path.join(__dirname, '..', 'views', 'emails', 'welcome.html');
  const template = await fs.readFile(templatePath, 'utf-8');
  const html = ejs.render(template, { username });

  await sendEmail({
    to: email,
    subject: 'Welcome to Echoefficiency!',
    text: `Welcome, ${username}! We are glad to have you.`,
    html: html,
  });
};

const handleSendSystemAlert = async (job) => {
    const { recipient, subject, queueName, failedCount, threshold } = job.data;
    console.log(`Sending system alert to ${recipient}`);

    const templatePath = path.join(__dirname, '..', 'views', 'emails', 'system-alert.html');
    const template = await fs.readFile(templatePath, 'utf-8');
    const html = ejs.render(template, { queueName, failedCount, threshold });

    await sendEmail({
        to: recipient,
        subject: subject,
        html: html,
        text: `System Alert: Queue "${queueName}" has ${failedCount} failed jobs, exceeding threshold of ${threshold}.`
    });
};

const processor = async (job) => {
  console.log(`Processing email job #${job.id} with name ${job.name}`);

  switch (job.name) {
    case 'send_welcome_email':
      await handleSendWelcomeEmail(job);
      break;
    case 'send_system_alert':
      await handleSendSystemAlert(job);
      break;
    default:
      console.log(`No handler for email job name: ${job.name}`);
  }
};

module.exports = processor;
