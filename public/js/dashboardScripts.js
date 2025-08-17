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

    const createFormDraftBtn = document.getElementById('createFormDraftBtn');
    if (createFormDraftBtn) {
        createFormDraftBtn.addEventListener('click', async () => {
            const title = document.getElementById('formTitle').value;
            const csrfToken = document.querySelector('input[name="_csrf"]').value;

            if (!title) {
                alert('Please enter a title for the form.');
                return;
            }

            try {
                const response = await fetch('/create-form-draft', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ title })
                });

                const createFormModalEl = document.getElementById('createFormModal');
                const createFormModal = bootstrap.Modal.getInstance(createFormModalEl);
                if (response.ok) {
                    const data = await response.json();
                    if (createFormModal) {
                        createFormModal.hide();
                    }
                    window.location.href = `/edit-form/${data.formId}`;
                } else {
                    const errorData = await response.json();
                    alert(`Error: ${errorData.message}`);
                }
            } catch (error) {
                console.error('Failed to create form draft:', error);
                alert('An error occurred while creating the form draft.');
            }
        });
    }
});

// Make the copy function globally available if it's not already
window.copyToClipboard = copyToClipboard;
