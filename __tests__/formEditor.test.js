const FormEditor = require('../public/js/formEditor');

describe('FormEditor', () => {
    let formEditor;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="questionsContainer"></div>
            <div id="inspector">
                <div id="general-tab-content"></div>
                <div id="logic-tab-content"></div>
            </div>
            <div id="mock-answers-panel"></div>
            <div id="preview-pane"></div>
            <div id="versions-dropdown"></div>
            <div id="compareModal"></div>
            <div id="publishModal">
                <div id="jsonSnapshot"></div>
            </div>
            <div id="errorContainer">
                <ul id="errorList"></ul>
            </div>
            <button id="validateBtn"></button>
            <button id="publishBtn"></button>
            <button id="save-version-btn"></button>
            <div id="compare-snapshot-name"></div>
            <select id="compare-with-select"></select>
            <div id="compare-results"></div>
            <input type="text" id="title" value="Test Form">
            <form id="editForm" action="/update-form/123">
                <input type="hidden" name="_csrf" value="test-token">
            </form>
        `;
        const form = document.getElementById('editForm');
        const formId = form.action.split('/').pop();
        const csrfToken = form.querySelector('input[name="_csrf"]').value;
        formEditor = new FormEditor(formId, csrfToken);
    });

    test('should add a number question block', () => {
        formEditor.addNumberQuestionBlock();
        const block = formEditor.questionsContainer.querySelector('.number-question');
        expect(block).not.toBeNull();
        expect(block.dataset.type).toBe('number');
    });

    test('should add an email question block', () => {
        formEditor.addEmailQuestionBlock();
        const block = formEditor.questionsContainer.querySelector('.email-question');
        expect(block).not.toBeNull();
        expect(block.dataset.type).toBe('email');
    });

    test('should add a date question block', () => {
        formEditor.addDateQuestionBlock();
        const block = formEditor.questionsContainer.querySelector('.date-question');
        expect(block).not.toBeNull();
        expect(block.dataset.type).toBe('date');
    });
});
