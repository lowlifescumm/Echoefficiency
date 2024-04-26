// This script handles the subscription form submission with Stripe

document.addEventListener('DOMContentLoaded', function() {
    var stripePublicKey = document.querySelector('#stripePublicKey').getAttribute('data-stripe-key');
    var stripe = Stripe(stripePublicKey);
    var elements = stripe.elements();
    var card = elements.create('card');
    card.mount('#card-element');

    card.addEventListener('change', function(event) {
        var displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
        } else {
            displayError.textContent = '';
        }
    });

    var form = document.getElementById('subscription-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();

        stripe.createPaymentMethod({
            type: 'card',
            card: card,
            billing_details: {
                // INPUT_REQUIRED {Add billing details here if required}
            },
        }).then(function(result) {
            if (result.error) {
                // Inform the user if there was an error
                var errorElement = document.getElementById('card-errors');
                errorElement.textContent = result.error.message;
            } else {
                // Send the PaymentMethod ID to your server
                paymentMethodHandler(result.paymentMethod.id);
            }
        });
    });

    function paymentMethodHandler(paymentMethodId) {
        // Insert the PaymentMethod ID into the form so it gets submitted to the server
        var form = document.getElementById('subscription-form');
        var hiddenInput = document.createElement('input');
        hiddenInput.setAttribute('type', 'hidden');
        hiddenInput.setAttribute('name', 'paymentMethodId');
        hiddenInput.setAttribute('value', paymentMethodId);
        form.appendChild(hiddenInput);

        // Add CSRF token
        var csrfInput = document.createElement('input');
        csrfInput.setAttribute('type', 'hidden');
        csrfInput.setAttribute('name', '_csrf');
        csrfInput.setAttribute('value', form.querySelector('input[name="_csrf"]').value);
        form.appendChild(csrfInput);

        console.log('Stripe PaymentMethod created:', paymentMethodId);

        // Submit the form
        form.submit();
    }
});