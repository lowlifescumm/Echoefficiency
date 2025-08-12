// This function can be called from the onclick attribute in the EJS template
function copyToClipboard(text) {
    if (!navigator.clipboard) {
        // Fallback for older browsers
        var textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Form link copied to clipboard!');
        } catch (err) {
            console.error('Fallback: Could not copy text', err);
        }
        document.body.removeChild(textArea);
        return;
    }
    navigator.clipboard.writeText(text).then(function() {
        console.log('Form link copied to clipboard!');
        alert('Form link copied to clipboard!');
    }, function(err) {
        console.error('Could not copy text: ', err);
    });
}

// Attach event listener for the delete confirmation modal
// We need to wait for the DOM to be fully loaded, especially if using jQuery.
document.addEventListener('DOMContentLoaded', function () {
    // Since jQuery is loaded on the page, we can use it.
    // If we wanted to remove jQuery, this would need to be rewritten in vanilla JS.
    if (window.jQuery) {
        $('#deleteConfirmModal').on('show.bs.modal', function (event) {
            var button = $(event.relatedTarget);
            var formId = button.data('form-id');
            var formTitle = button.data('form-title');
            var csrfToken = button.data('csrf-token');
            var modal = $(this);
            modal.find('.modal-body #formTitleToDelete').text(formTitle);
            modal.find('.modal-footer #deleteForm').attr('action', '/delete-form/' + formId);
            modal.find('.modal-footer #deleteForm input[name="_csrf"]').val(csrfToken);
        });
    } else {
        console.error('jQuery is not loaded. Modal script will not work.');
    }
});

// Make the copy function globally available if it's not already
window.copyToClipboard = copyToClipboard;
