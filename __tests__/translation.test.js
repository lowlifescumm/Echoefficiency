const FormEditor = require('../public/js/formEditor');

describe('Translation', () => {
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
            <form id="editForm" action="/update-form/123">
                <input type="hidden" name="_csrf" value="test-token">
            </form>
            <div id="translationModal" class="modal">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-body">
                            <table class="table">
                                <tbody id="translation-table-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <button id="translateBtn"></button>
            <button id="exportCsvBtn"></button>
        `;
        const form = document.getElementById('editForm');
        const formId = form.action.split('/').pop();
        const csrfToken = form.querySelector('input[name="_csrf"]').value;
        formEditor = new FormEditor(formId, csrfToken);
    });

    test('should extract strings from the form', () => {
        formEditor.addShortTextQuestionBlock();
        const strings = formEditor.extractStrings();
        expect(strings).toHaveProperty('title');
        expect(strings).toHaveProperty('p0_b0_q0_label');
    });

    test('should export strings as CSV', () => {
        formEditor.addShortTextQuestionBlock();
        const link = {
            click: jest.fn(),
            setAttribute: jest.fn(),
            removeAttribute: jest.fn()
        };
        jest.spyOn(document, 'createElement').mockReturnValue(link);
        formEditor.exportStringsAsCsv();
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(link.setAttribute).toHaveBeenCalledWith('href', expect.stringContaining('data:text/csv;charset=utf-8,'));
        expect(link.setAttribute).toHaveBeenCalledWith('download', 'translations.csv');
        expect(link.click).toHaveBeenCalled();
    });
});
