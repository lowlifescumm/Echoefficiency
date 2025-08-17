class AutosaveManager {
    constructor(formId, csrfToken) {
        this.formId = formId;
        this.csrfToken = csrfToken;
        this.saveTimeout = null;

        this.init();
    }

    init() {
        const form = document.getElementById('editForm');
        if (form) {
            form.addEventListener('input', () => this.scheduleSave());
            // Also listen for custom events that might be triggered by the form editor
            document.addEventListener('form-changed', () => this.scheduleSave());
        }
    }

    scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => this.save(), 2000);
    }

    serializeForm() {
        if (window.formEditor) {
            return window.formEditor.serializeForm();
        }
        return null;
    }

    async save() {
        const data = this.serializeForm();

        try {
            const response = await fetch(`/autosave-form/${this.formId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': this.csrfToken
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                console.log('Form autosaved successfully.');
                // Maybe show a small notification to the user.
            } else {
                console.error('Failed to autosave form.');
            }
        } catch (error) {
            console.error('Error during autosave:', error);
        }
    }
}
