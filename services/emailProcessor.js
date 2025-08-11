const sendEmail = require('../utils/sendEmail');
const fs = require('fs/promises');
const path = require('path');

const handleSendWelcomeEmail = async (job) => {
  const { email, username } = job.data;
  console.log(`Sending welcome email to ${email}`);

  // In a real app, you'd use a more sophisticated templating engine.
  // For now, we'll just read the file and replace a placeholder.
  const templatePath = path.join(__dirname, '..', 'emails', 'welcome.html');
  let html = await fs.readFile(templatePath, 'utf-8');
  html = html.replace('{{username}}', username);

  await sendEmail({
    to: email,
    subject: 'Welcome to Echoefficiency!',
    text: `Welcome, ${username}! We are glad to have you.`,
    html: html,
  });
};

const processor = async (job) => {
  console.log(`Processing email job #${job.id} with name ${job.name}`);

  switch (job.name) {
    case 'send_welcome_email':
      await handleSendWelcomeEmail(job);
      break;
    default:
      console.log(`No handler for email job name: ${job.name}`);
  }
};

module.exports = processor;
