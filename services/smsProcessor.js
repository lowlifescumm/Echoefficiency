const twilio = require('twilio');

let twilioClient;

// Singleton function to get or create the Twilio client
const getTwilioClient = () => {
    if (!twilioClient) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (accountSid && authToken) {
            twilioClient = twilio(accountSid, authToken);
        } else {
            console.log('Twilio credentials not found. SMS sending will be disabled.');
        }
    }
    return twilioClient;
}

const handleSendSms = async (job) => {
  const client = getTwilioClient();
  if (!client) {
    console.log('Twilio client not initialized. Skipping SMS send.');
    return;
  }

  const { to, body } = job.data;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  console.log(`Sending SMS to ${to}`);

  await client.messages.create({
    body: body,
    from: twilioPhoneNumber,
    to: to,
  });
};

const processor = async (job) => {
  console.log(`Processing SMS job #${job.id} with name ${job.name}`);

  switch (job.name) {
    case 'send_sms_notification':
      await handleSendSms(job);
      break;
    default:
      console.log(`No handler for SMS job name: ${job.name}`);
  }
};

module.exports = processor;
