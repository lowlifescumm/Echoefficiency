document.addEventListener('DOMContentLoaded', function() {
    const deleteButtons = document.querySelectorAll('.btn-danger');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            const formId = this.getAttribute('data-form-id');
            const csrfToken = this.getAttribute('data-csrf-token');
            const formTitle = this.closest('.list-group-item').querySelector('.form-title').textContent;
            const modalTitle = document.querySelector('#deleteConfirmModal .modal-title');
            const modalBody = document.querySelector('#deleteConfirmModal .modal-body');
            const deleteFormAction = document.querySelector('#deleteConfirmModal form');

            modalTitle.textContent = `Confirm Deletion`;
            modalBody.textContent = `Are you sure you want to delete the form "${formTitle}"?`;
            deleteFormAction.action = `/delete-form/${formId}`;
            deleteFormAction.querySelector('input[name="_csrf"]').value = csrfToken;
        });
    });

    // Clipboard copy functionality
    const shareButtons = document.querySelectorAll('.btn-secondary');
    shareButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            const formLink = this.getAttribute('data-form-link');
            if (formLink) {
                navigator.clipboard.writeText(formLink).then(function() {
                    console.log('Form link copied to clipboard:', formLink);
                    alert('Form link copied to clipboard!');
                }, function(err) {
                    console.error('Could not copy form link to clipboard:', err);
                    alert('Failed to copy the link. Please try again.');
                });
            } else {
                console.error('Error: Form link not found for form ID:', this.getAttribute('data-form-id'));
                alert('Error: Form link not found. Please try again.');
            }
        });
    });
});