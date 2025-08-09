// This script handles the subscription form submission with Stripe

document.addEventListener('DOMContentLoaded', function () {
  const stripePublicKey = document.querySelector('#stripePublicKey').getAttribute('data-stripe-key')
  const stripe = Stripe(stripePublicKey)
  const elements = stripe.elements()
  const card = elements.create('card')
  card.mount('#card-element')

  card.addEventListener('change', function (event) {
    const displayError = document.getElementById('card-errors')
    if (event.error) {
      displayError.textContent = event.error.message
    } else {
      displayError.textContent = ''
    }
  })

  const form = document.getElementById('subscription-form')
  form.addEventListener('submit', function (event) {
    event.preventDefault()

    stripe.createPaymentMethod({
      type: 'card',
      card,
      billing_details: {
        // INPUT_REQUIRED {Add billing details here if required}
      }
    }).then(function (result) {
      if (result.error) {
        // Inform the user if there was an error
        const errorElement = document.getElementById('card-errors')
        errorElement.textContent = result.error.message
      } else {
        // Send the PaymentMethod ID to your server
        paymentMethodHandler(result.paymentMethod.id)
      }
    })
  })

  function paymentMethodHandler (paymentMethodId) {
    // Insert the PaymentMethod ID into the form so it gets submitted to the server
    const form = document.getElementById('subscription-form')
    const hiddenInput = document.createElement('input')
    hiddenInput.setAttribute('type', 'hidden')
    hiddenInput.setAttribute('name', 'paymentMethodId')
    hiddenInput.setAttribute('value', paymentMethodId)
    form.appendChild(hiddenInput)

    // Add CSRF token
    const csrfInput = document.createElement('input')
    csrfInput.setAttribute('type', 'hidden')
    csrfInput.setAttribute('name', '_csrf')
    csrfInput.setAttribute('value', form.querySelector('input[name="_csrf"]').value)
    form.appendChild(csrfInput)

    console.log('Stripe PaymentMethod created:', paymentMethodId)

    // Submit the form
    form.submit()
  }
})
