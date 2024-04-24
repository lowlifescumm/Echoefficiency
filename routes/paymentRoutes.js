const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-subscription', isAuthenticated, async (req, res) => {
  try {
    const { email, paymentMethodId } = req.body;
    const customer = await stripe.customers.create({
      email: email,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ plan: process.env.STRIPE_PLAN_ID }], // Use your Stripe plan ID from environment variables
      expand: ['latest_invoice.payment_intent'],
    });

    console.log('Subscription created successfully:', subscription);
    res.status(200).json(subscription);
  } catch (error) {
    console.error('Create Subscription Error:', error);
    res.status(400).json({ error: 'An error occurred while creating a subscription', details: error.message });
  }
});

module.exports = router;