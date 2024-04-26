// This script handles the Stripe payment form integration for the subscription page.

// Load Stripe.js with the public key
var stripe = Stripe(document.getElementById('stripe-public-key').getAttribute('content')); // Use the Stripe public key from the HTML meta tag
var elements = stripe.elements();

// Custom styling can be passed to options when creating an Element.
var style = {
  base: {
    // Add your base input styles here. For example:
    fontSize: '16px',
    color: '#32325d',
  },
};

// Create an instance of the card Element.
var card = elements.create('card', {style: style});

// Add an instance of the card Element into the `card-element` div.
card.mount('#card-element');

// Handle real-time validation errors from the card Element.
card.on('change', function(event) {
  var displayError = document.getElementById('card-errors');
  if (event.error) {
    displayError.textContent = event.error.message;
  } else {
    displayError.textContent = '';
  }
});

// Handle form submission.
var form = document.getElementById('subscription-form');
form.addEventListener('submit', function(event) {
  event.preventDefault();

  stripe.createPaymentMethod({
    type: 'card',
    card: card,
    billing_details: {
      // Include any billing details required here
      email: document.getElementById('email').value,
    },
  }).then(function(result) {
    if (result.error) {
      // Inform the user if there was an error.
      var errorElement = document.getElementById('card-errors');
      errorElement.textContent = result.error.message;
    } else {
      // Send the payment method to your server.
      stripePaymentMethodHandler(result.paymentMethod);
    }
  });
});

// Submit the form with the payment method ID.
function stripePaymentMethodHandler(paymentMethod) {
  // Insert the payment method ID into the form so it gets submitted to the server
  var form = document.getElementById('subscription-form');
  var hiddenInput = document.createElement('input');
  hiddenInput.setAttribute('type', 'hidden');
  hiddenInput.setAttribute('name', 'paymentMethodId');
  hiddenInput.setAttribute('value', paymentMethod.id);
  form.appendChild(hiddenInput);

  // Log payment method creation for debugging
  console.log("Stripe payment method created for transaction:", paymentMethod.id);

  // Submit the form
  form.submit();
}