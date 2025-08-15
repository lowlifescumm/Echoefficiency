const { toHaveNoViolations } = require('jest-axe');
const FormEditor = require('../public/js/formEditor');

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

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
    let formEditor;

    beforeEach(() => {
        document.body.innerHTML = `
        <main>
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
            <div id="warningContainer">
                <ul id="warningList"></ul>
            </div>
            <button id="validateBtn">Validate</button>
            <button id="publishBtn">Publish</button>
            <button id="save-version-btn">Save Version</button>
            <div id="compare-snapshot-name"></div>
            <label for="compare-with-select">Compare with</label>
            <select id="compare-with-select"></select>
            <div id="compare-results"></div>
            <label for="title">Title</label>
            <input type="text" id="title" value="Test Form">
            <div id="theme-editor-panel">
                <label for="theme-primary-color">Primary Color</label>
                <input id="theme-primary-color" value="#000000">
                <label for="theme-border-radius">Border Radius</label>
                <input id="theme-border-radius" value="5">
                <label for="theme-font-family">Font Family</label>
                <input id="theme-font-family" value="Arial">
            </div>
            <button id="translateBtn">Translate</button>
            <button id="exportCsvBtn">Export CSV</button>
            <div id="command-palette">
                <label for="command-palette-input">Command</label>
                <input id="command-palette-input">
                <ul id="command-palette-results"></ul>
            </div>
            <form id="editForm" action="/update-form/123">
                <input type="hidden" name="_csrf" value="test-token">
            </form>
            <div id="aria-live-region" class="visually-hidden" aria-live="polite" aria-atomic="true"></div>
        </main>
        `;
        const form = document.getElementById('editForm');
        const formId = form.action.split('/').pop();
        const csrfToken = form.querySelector('input[name="_csrf"]').value;
        formEditor = new FormEditor(formId, csrfToken);
    });

    test('should have no accessibility violations', async () => {
        const results = await require('jest-axe').axe(document.body);
        expect(results).toHaveNoViolations();
    });
});
