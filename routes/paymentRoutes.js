const express = require('express')
const router = express.Router()
const { isAuthenticated } = require('./middleware/authMiddleware')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

// Serve the subscription page and pass the Stripe public key
router.get('/subscribe', isAuthenticated, (req, res) => {
  res.render('subscribe', { STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY })
})

router.post('/create-subscription', isAuthenticated, async (req, res) => {
  try {
    const { email, stripeToken } = req.body
    // Check if the customer already exists
    let customer = await stripe.customers.list({
      email,
      limit: 1
    })

    if (customer.data.length === 0) {
      // Create a new customer if not exists
      customer = await stripe.customers.create({
        email,
        source: stripeToken // Changed from payment_method to source to match the token from the form
      })
    } else {
      // Use the existing customer
      customer = customer.data[0]
      // Attach the source if customer already exists and does not have a default source
      if (!customer.default_source) {
        await stripe.customers.update(customer.id, {
          source: stripeToken
        })
      }
    }

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      expand: ['latest_invoice.payment_intent']
    })

    console.log('Subscription created successfully:', subscription)
    res.status(200).json({ message: 'Subscription created successfully', subscriptionId: subscription.id })
  } catch (error) {
    console.error('Create Subscription Error:', error)
    console.error(error.stack)
    res.status(400).json({ error: 'An error occurred while creating a subscription', details: error.message })
  }
})

module.exports = router
