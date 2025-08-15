global.bootstrap = {
    Modal: class {
        constructor(el) {
            this.el = el;
        }
        show() {
            this.el.classList.add('show');
        }
        hide() {
            this.el.classList.remove('show');
        }
    }
};
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
            <div id="theme-editor-panel">
                <input id="theme-primary-color" value="#000000">
                <input id="theme-border-radius" value="5">
                <input id="theme-font-family" value="Arial">
            </div>
            <button id="translateBtn"></button>
            <button id="exportCsvBtn"></button>
            <div id="command-palette">
                <input id="command-palette-input">
                <ul id="command-palette-results"></ul>
            </div>
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

    test('should add a matrix (single-select) question block', () => {
        formEditor.addMatrixSingleQuestionBlock();
        const block = formEditor.questionsContainer.querySelector('.matrix-single-question');
        expect(block).not.toBeNull();
        expect(block.dataset.type).toBe('matrix-single');
    });

    test('should add a matrix (multi-select) question block', () => {
        formEditor.addMatrixMultiQuestionBlock();
        const block = formEditor.questionsContainer.querySelector('.matrix-multi-question');
        expect(block).not.toBeNull();
        expect(block.dataset.type).toBe('matrix-multi');
    });

    test('should add a ranking question block', () => {
        formEditor.addRankingQuestionBlock();
        const block = formEditor.questionsContainer.querySelector('.ranking-question');
        expect(block).not.toBeNull();
        expect(block.dataset.type).toBe('ranking');
    });

    test('should serialize a matrix question', () => {
        formEditor.addMatrixSingleQuestionBlock();
        const surveyData = formEditor.serializeForm();
        const question = surveyData.pages[0].blocks[0].questions[0];
        expect(question.type).toBe('matrix-single');
        expect(question.rows).toEqual(['Row 1']);
        expect(question.cols).toEqual(['Column 1']);
    });

    test('should serialize a ranking question', () => {
        formEditor.addRankingQuestionBlock();
        const surveyData = formEditor.serializeForm();
        const question = surveyData.pages[0].blocks[0].questions[0];
        expect(question.type).toBe('ranking');
        expect(question.items).toEqual(['Item 1', 'Item 2']);
    });

    test('should add a file upload question block', () => {
        formEditor.addFileUploadQuestionBlock();
        const block = formEditor.questionsContainer.querySelector('.file-upload-question');
        expect(block).not.toBeNull();
        expect(block.dataset.type).toBe('file-upload');
    });

    test('should add a consent checkbox block', () => {
        formEditor.addConsentCheckboxBlock();
        const block = formEditor.questionsContainer.querySelector('.consent-checkbox-block');
        expect(block).not.toBeNull();
        expect(block.dataset.type).toBe('consent-checkbox');
    });

    test('should serialize a file upload question', () => {
        formEditor.addFileUploadQuestionBlock();
        const surveyData = formEditor.serializeForm();
        const question = surveyData.pages[0].blocks[0].questions[0];
        expect(question.type).toBe('file-upload');
        expect(question.allowedFileTypes).toEqual([]);
        expect(question.maxFileSize).toBe('10');
    });

    test('should serialize a consent checkbox', () => {
        formEditor.addConsentCheckboxBlock();
        const surveyData = formEditor.serializeForm();
        const question = surveyData.pages[0].blocks[0].questions[0];
        expect(question.type).toBe('consent-checkbox');
        expect(question.consentText).toBe('I agree to the terms and conditions.');
    });
});
