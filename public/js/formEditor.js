const Sortable = require('sortablejs');
const HistoryManager = require('./historyManager');
const SnapshotManager = require('./snapshotManager');
const AutosaveManager = require('./autosaveManager');
const generateUniqueId = require('./idGenerator');
const compareSnapshots = require('./snapshotComparer');
const evaluatePredicate = require('./predicateEvaluator');
const resolvePlaceholders = require('./placeholderResolver');
const ThemeManager = require('./themeManager');

class FormEditor {
    constructor(formId, csrfToken) {
        this.formId = formId;
        this.csrfToken = csrfToken;
        this.questionsContainer = document.getElementById('questionsContainer');
        this.inspector = document.getElementById('inspector');
        this.generalTabContent = document.getElementById('general-tab-content');
        this.logicTabContent = document.getElementById('logic-tab-content');
        this.selectedBlock = null;
        this.history = new HistoryManager();
        this.snapshotManager = new SnapshotManager();
        this.autosaveManager = new AutosaveManager(formId, new Date().toISOString());
        this.themeManager = new ThemeManager();

        this.init();
    }

    init() {
        this.history.addState(this.questionsContainer.innerHTML);
        this.renderMockAnswersPanel();
        new Sortable(this.questionsContainer, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            fallbackOnBody: true,
            swapThreshold: 0.65,
            forceFallback: true,
            placeholderClass: 'sortable-placeholder',
            onEnd: (evt) => {
                this.history.addState(this.questionsContainer.innerHTML);
                const blockId = evt.item.dataset.id;
                const newIndex = evt.newIndex;
                this.autosaveManager.addOp({ op: 'move', blockId, newIndex });
                this.renderPreview();
                this.renderMockAnswersPanel();
            }
        });

        this.questionsContainer.addEventListener('click', (e) => {
            const block = e.target.closest('.block');
            if (block) {
                if (this.selectedBlock) {
                    this.selectedBlock.classList.remove('selected');
                }
                block.classList.add('selected');
                this.selectedBlock = block;
                this.inspector.style.display = 'block';
                this.renderInspector();
            }
        });

        const validateBtn = document.getElementById('validateBtn');
        validateBtn.addEventListener('click', () => this.validateForm());

        const publishBtn = document.getElementById('publishBtn');
        publishBtn.addEventListener('click', () => this.publishForm());

        const saveVersionBtn = document.getElementById('save-version-btn');
        saveVersionBtn.addEventListener('click', () => this.saveVersion());

        const versionsDropdown = document.getElementById('versions-dropdown');
        versionsDropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('restore-btn')) {
                const snapshotName = e.target.dataset.name;
                const snapshot = this.snapshotManager.getSnapshot(snapshotName);
                if (snapshot) {
                    this.restoreSnapshot(snapshot.data);
                }
            } else if (e.target.classList.contains('delete-snapshot-btn')) {
                const snapshotName = e.target.dataset.name;
                if (confirm(`Are you sure you want to delete snapshot "${snapshotName}"?`)) {
                    this.snapshotManager.deleteSnapshot(snapshotName);
                    this.renderVersionsMenu();
                }
            } else if (e.target.classList.contains('compare-btn')) {
                const snapshotName = e.target.dataset.name;
                this.openCompareModal(snapshotName);
            }
        });

        const mockAnswersPanel = document.getElementById('mock-answers-panel');
        mockAnswersPanel.addEventListener('input', () => {
            const mockAnswers = {};
            const answerInputs = mockAnswersPanel.querySelectorAll('.mock-answer-input');
            answerInputs.forEach(input => {
                mockAnswers[input.dataset.questionId] = input.value;
            });
            this.renderPreview(mockAnswers);
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    this.undo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    this.redo();
                }
            }
        });

        this.renderVersionsMenu();

        const themeEditorPanel = document.getElementById('theme-editor-panel');
        themeEditorPanel.addEventListener('input', (e) => {
            const theme = {
                primaryColor: document.getElementById('theme-primary-color').value,
                borderRadius: document.getElementById('theme-border-radius').value,
                fontFamily: document.getElementById('theme-font-family').value
            };
            this.applyTheme(theme);
            this.themeManager.saveTheme(theme);
        });

        const savedTheme = this.themeManager.loadTheme();
        if (savedTheme) {
            this.applyTheme(savedTheme);
            document.getElementById('theme-primary-color').value = savedTheme.primaryColor;
            document.getElementById('theme-border-radius').value = savedTheme.borderRadius;
            document.getElementById('theme-font-family').value = savedTheme.fontFamily;
        }

        const translateBtn = document.getElementById('translateBtn');
        translateBtn.addEventListener('click', () => this.openTranslationModal());

        const exportCsvBtn = document.getElementById('exportCsvBtn');
        exportCsvBtn.addEventListener('click', () => this.exportStringsAsCsv());
    }

    updateBlockWarnings(block) {
        const warningsContainer = block.querySelector('.warnings-container') || document.createElement('div');
        warningsContainer.className = 'warnings-container';
        warningsContainer.innerHTML = '';

        const label = block.querySelector('.form-label')?.textContent;
        if (!label) {
            warningsContainer.innerHTML += '<span class="badge bg-danger ms-2">Missing Title</span>';
        }

        if (block.dataset.type === 'single-choice' || block.dataset.type === 'multiple-choice') {
            const optionsContainer = block.querySelector('.options-container');
            if (optionsContainer.children.length === 0) {
                warningsContainer.innerHTML += '<span class="badge bg-danger ms-2">Empty Options</span>';
            }
        }

        if (warningsContainer.innerHTML) {
            block.appendChild(warningsContainer);
        } else if (warningsContainer.parentElement) {
            warningsContainer.remove();
        }
    }

    renderInspector() {
        if (!this.selectedBlock) return;
        this.generalTabContent.innerHTML = '';
        this.logicTabContent.innerHTML = '';
        const blockType = this.selectedBlock.dataset.type;

        if (blockType === 'text-block') {
            const textarea = this.selectedBlock.querySelector('textarea');
            this.generalTabContent.innerHTML = `
                <div class="mb-3">
                    <label for="inspector-text" class="form-label">Text</label>
                    <textarea id="inspector-text" class="form-control" rows="3">${textarea.value}</textarea>
                </div>
            `;
            const inspectorTextarea = document.getElementById('inspector-text');
            inspectorTextarea.addEventListener('input', (e) => {
                textarea.value = e.target.value;
            });
        } else if (blockType === 'divider') {
                this.generalTabContent.innerHTML = 'No properties to edit for this block.';
            } else if (blockType === 'text' || blockType === 'multipleChoice' || blockType === 'checkbox' || blockType === 'rating' || blockType === 'number' || blockType === 'email' || blockType === 'date') {
            const label = this.selectedBlock.querySelector('.form-label').textContent;
            const helpText = this.selectedBlock.querySelector('.form-text').textContent;
            const isRequired = this.selectedBlock.querySelector('input[name="blocks[][required]"]')?.checked || false;

            this.generalTabContent.innerHTML = `
                <div class="mb-3">
                    <label for="inspector-label" class="form-label">Label</label>
                    <input type="text" id="inspector-label" class="form-control" value="${label}">
                </div>
                <div class="mb-3">
                    <label for="inspector-help-text" class="form-label">Help Text</label>
                    <input type="text" id="inspector-help-text" class="form-control" value="${helpText}">
                </div>
                <div class="mb-3 form-check">
                    <input type="checkbox" class="form-check-input" id="inspector-required" ${isRequired ? 'checked' : ''}>
                    <label class="form-check-label" for="inspector-required">Required</label>
                </div>
            `;

            const tribute = new Tribute({
                trigger: '{{',
                values: (text, cb) => {
                    const previousQuestions = this.getPreviousQuestions();
                    cb(previousQuestions);
                },
                selectTemplate: (item) => {
                    return `{{answers.${item.original.key}}}`;
                },
                menuItemTemplate: (item) => {
                    return `${item.original.key} - ${item.original.value}`;
                }
            });
            tribute.attach(document.getElementById('inspector-label'));
            tribute.attach(document.getElementById('inspector-help-text'));

            document.getElementById('inspector-label').addEventListener('input', (e) => {
                this.selectedBlock.querySelector('.form-label').textContent = e.target.value;
                this.selectedBlock.querySelector('input[name="blocks[][label]"]').value = e.target.value;
                this.updateBlockWarnings(this.selectedBlock);
                this.renderPreview();
            });
            document.getElementById('inspector-help-text').addEventListener('input', (e) => {
                this.selectedBlock.querySelector('.form-text').textContent = e.target.value;
                this.selectedBlock.querySelector('input[name="blocks[][helpText]"]').value = e.target.value;
                this.renderPreview();
            });
            document.getElementById('inspector-required').addEventListener('change', (e) => {
                let requiredInput = this.selectedBlock.querySelector('input[name="blocks[][required]"]');
                if (!requiredInput) {
                    requiredInput = document.createElement('input');
                    requiredInput.type = 'hidden';
                    requiredInput.name = 'blocks[][required]';
                    this.selectedBlock.appendChild(requiredInput);
                }
                requiredInput.value = e.target.checked;
                this.renderPreview();
            });

            if (blockType === 'single-choice' || blockType === 'multiple-choice') {
                const optionsContainer = this.selectedBlock.querySelector('.options-container');
                const isShuffle = this.selectedBlock.querySelector('input[name="blocks[][shuffle]"]')?.value === 'true' || false;
                const optionsHTML = Array.from(optionsContainer.children).map((option, index) => {
                    const optionText = option.querySelector('label').textContent.trim();
                    const isPinned = option.querySelector('input[type="hidden"]')?.dataset.pinned === 'true' || false;
                    return `
                        <div class="d-flex mb-2">
                            <button type="button" class="btn btn-light me-2" onclick="formEditor.togglePin(this, ${index})">${isPinned ? '📌' : '📍'}</button>
                            <input type="text" class="form-control" value="${optionText}" oninput="formEditor.updateOption(this, ${index})">
                            <button type="button" class="btn btn-danger ms-2" onclick="formEditor.removeOption(this, ${index})">Remove</button>
                        </div>
                    `;
                }).join('');

                this.generalTabContent.innerHTML += `
                    <hr>
                    <h5>Options</h5>
                    <div class="mb-3 form-check">
                        <input type="checkbox" class="form-check-input" id="inspector-shuffle" ${isShuffle ? 'checked' : ''}>
                        <label class="form-check-label" for="inspector-shuffle">Shuffle choices</label>
                    </div>
                    <div id="inspector-options">
                        ${optionsHTML}
                    </div>
                    <button type="button" class="btn btn-secondary mt-2" onclick="formEditor.addOption()">Add Option</button>
                `;

                document.getElementById('inspector-shuffle').addEventListener('change', (e) => {
                    let shuffleInput = this.selectedBlock.querySelector('input[name="blocks[][shuffle]"]');
                    if (!shuffleInput) {
                        shuffleInput = document.createElement('input');
                        shuffleInput.type = 'hidden';
                        shuffleInput.name = 'blocks[][shuffle]';
                        this.selectedBlock.appendChild(shuffleInput);
                    }
                    shuffleInput.value = e.target.checked;
                });
            }

                if (blockType === 'number') {
                    const min = this.selectedBlock.querySelector('input[name="blocks[][min]"]').value;
                    const max = this.selectedBlock.querySelector('input[name="blocks[][max]"]').value;
                    const step = this.selectedBlock.querySelector('input[name="blocks[][step]"]').value;

                    this.generalTabContent.innerHTML += `
                        <hr>
                        <h5>Number Properties</h5>
                        <div class="mb-3">
                            <label for="inspector-min" class="form-label">Min</label>
                            <input type="number" id="inspector-min" class="form-control" value="${min}">
                        </div>
                        <div class="mb-3">
                            <label for="inspector-max" class="form-label">Max</label>
                            <input type="number" id="inspector-max" class="form-control" value="${max}">
                        </div>
                        <div class="mb-3">
                            <label for="inspector-step" class="form-label">Step</label>
                            <input type="number" id="inspector-step" class="form-control" value="${step}">
                        </div>
                    `;

                    document.getElementById('inspector-min').addEventListener('input', (e) => {
                        this.selectedBlock.querySelector('input[name="blocks[][min]"]').value = e.target.value;
                    });
                    document.getElementById('inspector-max').addEventListener('input', (e) => {
                        this.selectedBlock.querySelector('input[name="blocks[][max]"]').value = e.target.value;
                    });
                    document.getElementById('inspector-step').addEventListener('input', (e) => {
                        this.selectedBlock.querySelector('input[name="blocks[][step]"]').value = e.target.value;
                    });
                }

        if (blockType === 'matrix-single' || blockType === 'matrix-multi') {
            const rowsValue = this.selectedBlock.querySelector('input[name="blocks[][rows]"]').value;
            const colsValue = this.selectedBlock.querySelector('input[name="blocks[][cols]"]').value;
            const rows = rowsValue ? JSON.parse(rowsValue) : [];
            const cols = colsValue ? JSON.parse(colsValue) : [];

            this.generalTabContent.innerHTML += `
                <hr>
                <h5>Matrix Properties</h5>
                <div class="mb-3">
                    <label for="inspector-rows" class="form-label">Rows (one per line)</label>
                    <textarea id="inspector-rows" class="form-control" rows="3">${rows.join('\n')}</textarea>
                </div>
                <div class="mb-3">
                    <label for="inspector-cols" class="form-label">Columns (one per line)</label>
                    <textarea id="inspector-cols" class="form-control" rows="3">${cols.join('\n')}</textarea>
                </div>
            `;

            document.getElementById('inspector-rows').addEventListener('input', (e) => {
                this.selectedBlock.querySelector('input[name="blocks[][rows]"]').value = JSON.stringify(e.target.value.split('\n'));
            });
            document.getElementById('inspector-cols').addEventListener('input', (e) => {
                this.selectedBlock.querySelector('input[name="blocks[][cols]"]').value = JSON.stringify(e.target.value.split('\n'));
            });
        }

        if (blockType === 'ranking') {
            const itemsValue = this.selectedBlock.querySelector('input[name="blocks[][items]"]').value;
            const items = itemsValue ? JSON.parse(itemsValue) : [];

            this.generalTabContent.innerHTML += `
                <hr>
                <h5>Ranking Items</h5>
                <div id="inspector-ranking-items">
                    ${items.map((item, index) => `
                        <div class="d-flex mb-2 ranking-item">
                            <span class="drag-handle me-2"></span>
                            <input type="text" class="form-control" value="${item}" oninput="formEditor.updateRankingItem(this, ${index})">
                            <button type="button" class="btn btn-danger ms-2" onclick="formEditor.removeRankingItem(this, ${index})">Remove</button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" class="btn btn-secondary mt-2" onclick="formEditor.addRankingItem()">Add Item</button>
            `;

            const rankingItemsContainer = document.getElementById('inspector-ranking-items');
            new Sortable(rankingItemsContainer, {
                animation: 150,
                handle: '.drag-handle',
                onEnd: (evt) => {
                    const items = Array.from(rankingItemsContainer.querySelectorAll('.ranking-item input')).map(input => input.value);
                    this.selectedBlock.querySelector('input[name="blocks[][items]"]').value = JSON.stringify(items);
                }
            });
        }

        if (blockType === 'file-upload') {
            const allowedFileTypes = JSON.parse(this.selectedBlock.querySelector('input[name="blocks[][allowedFileTypes]"]').value);
            const maxFileSize = this.selectedBlock.querySelector('input[name="blocks[][maxFileSize]"]').value;

            this.generalTabContent.innerHTML += `
                <hr>
                <h5>File Upload Properties</h5>
                <div class="mb-3">
                    <label for="inspector-allowed-file-types" class="form-label">Allowed File Types (comma-separated)</label>
                    <input type="text" id="inspector-allowed-file-types" class="form-control" value="${allowedFileTypes.join(',')}">
                </div>
                <div class="mb-3">
                    <label for="inspector-max-file-size" class="form-label">Max File Size (MB)</label>
                    <input type="number" id="inspector-max-file-size" class="form-control" value="${maxFileSize}">
                </div>
            `;

            document.getElementById('inspector-allowed-file-types').addEventListener('input', (e) => {
                this.selectedBlock.querySelector('input[name="blocks[][allowedFileTypes]"]').value = JSON.stringify(e.target.value.split(',').map(s => s.trim()));
            });
            document.getElementById('inspector-max-file-size').addEventListener('input', (e) => {
                this.selectedBlock.querySelector('input[name="blocks[][maxFileSize]"]').value = e.target.value;
            });
        }

        if (blockType === 'consent-checkbox') {
            const consentText = this.selectedBlock.querySelector('input[name="blocks[][consentText]"]').value;

            this.generalTabContent.innerHTML += `
                <hr>
                <h5>Consent Checkbox Properties</h5>
                <div class="mb-3">
                    <label for="inspector-consent-text" class="form-label">Consent Text</label>
                    <textarea id="inspector-consent-text" class="form-control" rows="3">${consentText}</textarea>
                </div>
            `;

            document.getElementById('inspector-consent-text').addEventListener('input', (e) => {
                this.selectedBlock.querySelector('input[name="blocks[][consentText]"]').value = e.target.value;
                this.selectedBlock.querySelector('.form-check-label').textContent = e.target.value;
            });
        }

            // Render Logic Tab
            this.logicTabContent.innerHTML = `
                <div class="mb-3">
                    <label for="logic-condition" class="form-label">Show this question if</label>
                    <select id="logic-condition" class="form-select">
                        <option value="AND">All</option>
                        <option value="OR">Any</option>
                    </select>
                    <span>of the following match:</span>
                </div>
                <div id="rule-list"></div>
                <button type="button" id="add-rule-btn" class="btn btn-secondary mt-2">Add Rule</button>
            `;

            document.getElementById('add-rule-btn').addEventListener('click', () => this.addRule());
            this.logicTabContent.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-rule-btn')) {
                    this.removeRule(e.target.parentElement);
                }
            });
            this.logicTabContent.addEventListener('change', () => this.updateDisplayLogic());

            // Data binding
            const hiddenInput = this.selectedBlock.querySelector('input[name="blocks[][displayLogic]"]');
            if (hiddenInput && hiddenInput.value) {
                const displayLogic = JSON.parse(hiddenInput.value);
                document.getElementById('logic-condition').value = displayLogic.condition;
                const ruleList = document.getElementById('rule-list');
                displayLogic.rules.forEach(ruleData => {
                    const ruleTemplate = document.getElementById('rule-template');
                    const newRule = ruleTemplate.content.cloneNode(true);
                    this.populatePreviousQuestions(newRule.querySelector('[name="rule-question"]'));
                    newRule.querySelector('[name="rule-question"]').value = ruleData.questionId;
                    newRule.querySelector('[name="rule-operator"]').value = ruleData.operator;
                    newRule.querySelector('[name="rule-value"]').value = ruleData.value;
                    ruleList.appendChild(newRule);
                });
            }
        }
    }

    togglePin(button, index) {
        const optionsContainer = this.selectedBlock.querySelector('.options-container');
        const optionEl = optionsContainer.children[index];
        const hiddenInput = optionEl.querySelector('input[name$="[pinned]"]');
        const isPinned = hiddenInput.value === 'true';
        hiddenInput.value = !isPinned;
        hiddenInput.dataset.pinned = !isPinned;
        button.textContent = !isPinned ? '📌' : '📍';
    }

    updateOption(input, index) {
        const optionsContainer = this.selectedBlock.querySelector('.options-container');
        const optionLabel = optionsContainer.children[index].querySelector('label');
        optionLabel.textContent = input.value;
        const hiddenInput = optionsContainer.children[index].querySelector('input[type="hidden"]');
        hiddenInput.value = input.value;
        this.renderPreview();
    }

    removeOption(button, index) {
        const optionsContainer = this.selectedBlock.querySelector('.options-container');
        optionsContainer.children[index].remove();
        this.renderInspector();
        this.updateBlockWarnings(this.selectedBlock);
        this.renderPreview();
    }

    updateRankingItem(input, index) {
        const items = JSON.parse(this.selectedBlock.querySelector('input[name="blocks[][items]"]').value);
        items[index] = input.value;
        this.selectedBlock.querySelector('input[name="blocks[][items]"]').value = JSON.stringify(items);
    }

    removeRankingItem(button, index) {
        const items = JSON.parse(this.selectedBlock.querySelector('input[name="blocks[][items]"]').value);
        items.splice(index, 1);
        this.selectedBlock.querySelector('input[name="blocks[][items]"]').value = JSON.stringify(items);
        this.renderInspector();
    }

    addRankingItem() {
        const items = JSON.parse(this.selectedBlock.querySelector('input[name="blocks[][items]"]').value);
        items.push('New Item');
        this.selectedBlock.querySelector('input[name="blocks[][items]"]').value = JSON.stringify(items);
        this.renderInspector();
    }

    addOption(optionData = { text: 'New Option', pinned: false }) {
        const optionsContainer = this.selectedBlock.querySelector('.options-container');
        const blockId = this.selectedBlock.dataset.id;
        const optionIndex = optionsContainer.children.length;
        const optionType = this.selectedBlock.dataset.type === 'single-choice' ? 'radio' : 'checkbox';
        const newOptionHTML = `
            <div class="form-check">
                <input type="hidden" name="blocks[][options][${optionIndex}][text]" value="${optionData.text}">
                <input type="hidden" name="blocks[][options][${optionIndex}][pinned]" value="${optionData.pinned}" data-pinned="${optionData.pinned}">
                <input class="form-check-input" type="${optionType}" name="${optionType}-${blockId}" id="${optionType}-${blockId}-${optionIndex + 1}">
                <label class="form-check-label" for="${optionType}-${blockId}-${optionIndex + 1}">
                    ${optionData.text}
                </label>
            </div>
        `;
        optionsContainer.insertAdjacentHTML('beforeend', newOptionHTML);
        this.renderInspector();
        this.updateBlockWarnings(this.selectedBlock);
        this.renderPreview();
    }

    addRule() {
        const ruleTemplate = document.getElementById('rule-template');
        const newRule = ruleTemplate.content.cloneNode(true);
        const ruleList = document.getElementById('rule-list');
        this.populatePreviousQuestions(newRule.querySelector('[name="rule-question"]'));
        ruleList.appendChild(newRule);
        this.updateDisplayLogic();
    }

    removeRule(ruleElement) {
        ruleElement.remove();
        this.updateDisplayLogic();
    }

    populatePreviousQuestions(selectElement) {
        selectElement.innerHTML = '<option value="">Select a question...</option>';
        const blocks = Array.from(this.questionsContainer.children);
        const selectedIndex = blocks.indexOf(this.selectedBlock);
        for (let i = 0; i < selectedIndex; i++) {
            const block = blocks[i];
            const label = block.querySelector('.form-label')?.textContent.trim();
            if (label) {
                const option = document.createElement('option');
                option.value = block.dataset.id;
                option.textContent = label;
                selectElement.appendChild(option);
            }
        }
    }

    updateDisplayLogic() {
        const logicCondition = document.getElementById('logic-condition').value;
        const ruleElements = document.querySelectorAll('#rule-list .rule');
        const rules = Array.from(ruleElements).map(ruleEl => ({
            questionId: ruleEl.querySelector('[name="rule-question"]').value,
            operator: ruleEl.querySelector('[name="rule-operator"]').value,
            value: ruleEl.querySelector('[name="rule-value"]').value,
        }));

        const displayLogic = {
            condition: logicCondition,
            rules: rules,
        };

        let hiddenInput = this.selectedBlock.querySelector('input[name="blocks[][displayLogic]"]');
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'blocks[][displayLogic]';
            this.selectedBlock.appendChild(hiddenInput);
        }
        hiddenInput.value = JSON.stringify(displayLogic);
    }

    getPreviousQuestions() {
        const blocks = Array.from(this.questionsContainer.children);
        const selectedIndex = blocks.indexOf(this.selectedBlock);
        const previousQuestions = [];
        for (let i = 0; i < selectedIndex; i++) {
            const block = blocks[i];
            if (block.classList.contains('question')) {
                const id = block.dataset.id;
                const label = block.querySelector('.form-label')?.textContent.trim();
                if (id && label) {
                    previousQuestions.push({ key: id, value: label });
                }
            }
        }
        return previousQuestions;
    }

    addBlock(html, blockData) {
        this.history.addState(this.questionsContainer.innerHTML);
        this.autosaveManager.addOp({ op: 'add', block: blockData });
        this.questionsContainer.insertAdjacentHTML('beforeend', html);
        const newBlock = this.questionsContainer.lastElementChild;
        this.updateBlockWarnings(newBlock);
        this.renderPreview();
        this.renderMockAnswersPanel();
    }

    addShortTextQuestionBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('short-text-question', existingIds);
        const blockData = {
            id,
            type: 'short-text',
            label: 'Short Text Question',
            helpText: 'Help text goes here.',
            required: false,
        };
        const html = `
            <div class="mb-3 question short-text-question block" data-id="${id}" data-type="text">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="short-text">
                <input type="hidden" name="blocks[][label]" value="${blockData.label}">
                <input type="hidden" name="blocks[][helpText]" value="${blockData.helpText}">
                <input type="hidden" name="blocks[][required]" value="${blockData.required}">
                <span class="drag-handle"></span>
                <label class="form-label">${blockData.label}</label>
                <input type="text" class="form-control" placeholder="Short answer text">
                <small class="form-text text-muted">${blockData.helpText}</small>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(html, blockData);
    }

    addFileUploadQuestionBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('file-upload-question', existingIds);
        const blockData = {
            id,
            type: 'file-upload',
            label: 'File Upload Question',
            helpText: 'Help text goes here.',
            required: false,
            allowedFileTypes: [],
            maxFileSize: 10
        };
        const html = `
            <div class="mb-3 question file-upload-question block" data-id="${id}" data-type="file-upload">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="file-upload">
                <input type="hidden" name="blocks[][label]" value="${blockData.label}">
                <input type="hidden" name="blocks[][helpText]" value="${blockData.helpText}">
                <input type="hidden" name="blocks[][required]" value="${blockData.required}">
                <input type="hidden" name="blocks[][allowedFileTypes]" value='${JSON.stringify(blockData.allowedFileTypes)}'>
                <input type="hidden" name="blocks[][maxFileSize]" value="${blockData.maxFileSize}">
                <span class="drag-handle"></span>
                <label class="form-label">${blockData.label}</label>
                <small class="form-text text-muted">${blockData.helpText}</small>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(html, blockData);
    }

    addConsentCheckboxBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('consent-checkbox-block', existingIds);
        const blockData = {
            id,
            type: 'consent-checkbox',
            label: 'Consent Checkbox',
            required: true,
            consentText: 'I agree to the terms and conditions.'
        };
        const html = `
            <div class="mb-3 consent-checkbox-block block" data-id="${id}" data-type="consent-checkbox">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="consent-checkbox">
                <input type="hidden" name="blocks[][label]" value="${blockData.label}">
                <input type="hidden" name="blocks[][required]" value="${blockData.required}">
                <input type="hidden" name="blocks[][consentText]" value="${blockData.consentText}">
                <span class="drag-handle"></span>
                <label class="form-label">${blockData.label}</label>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="" id="consent-checkbox-${id}" disabled>
                    <label class="form-check-label" for="consent-checkbox-${id}">
                        ${blockData.consentText}
                    </label>
                </div>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(html, blockData);
    }

    addSingleChoiceQuestionBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('single-choice-question', existingIds);
        const blockData = {
            id,
            type: 'single-choice',
            label: 'Single Choice Question',
            helpText: 'Help text goes here.',
            required: false,
            shuffle: false,
            options: [{ text: 'Option 1', pinned: false }]
        };
        const html = `
            <div class="mb-3 question single-choice-question block" data-id="${id}" data-type="multipleChoice">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="single-choice">
                <input type="hidden" name="blocks[][label]" value="${blockData.label}">
                <input type="hidden" name="blocks[][helpText]" value="${blockData.helpText}">
                <input type="hidden" name="blocks[][required]" value="${blockData.required}">
                <input type="hidden" name="blocks[][shuffle]" value="${blockData.shuffle}">
                <span class="drag-handle"></span>
                <label class="form-label">${blockData.label}</label>
                <div class="options-container">
                    <div class="form-check">
                        <input type="hidden" name="blocks[][options][0][text]" value="Option 1">
                        <input type="hidden" name="blocks[][options][0][pinned]" value="false" data-pinned="false">
                        <input class="form-check-input" type="radio" name="radio-${id}" id="radio-${id}-1">
                        <label class="form-check-label" for="radio-${id}-1">
                            Option 1
                        </label>
                    </div>
                </div>
                <small class="form-text text-muted">${blockData.helpText}</small>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(html, blockData);
    }

    addMultipleChoiceQuestionBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('multiple-choice-question', existingIds);
        const blockData = {
            id,
            type: 'multiple-choice',
            label: 'Multiple Choice Question',
            helpText: 'Help text goes here.',
            required: false,
            shuffle: false,
            options: [{ text: 'Option 1', pinned: false }]
        };
        const html = `
            <div class="mb-3 question multiple-choice-question block" data-id="${id}" data-type="checkbox">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="multiple-choice">
                <input type="hidden" name="blocks[][label]" value="${blockData.label}">
                <input type="hidden" name="blocks[][helpText]" value="${blockData.helpText}">
                <input type="hidden" name="blocks[][required]" value="${blockData.required}">
                <input type="hidden" name="blocks[][shuffle]" value="${blockData.shuffle}">
                <span class="drag-handle"></span>
                <label class="form-label">${blockData.label}</label>
                <div class="options-container">
                    <div class="form-check">
                        <input type="hidden" name="blocks[][options][0][text]" value="Option 1">
                        <input type="hidden" name="blocks[][options][0][pinned]" value="false" data-pinned="false">
                        <input class="form-check-input" type="checkbox" id="checkbox-${id}-1">
                        <label class="form-check-label" for="checkbox-${id}-1">
                            Option 1
                        </label>
                    </div>
                </div>
                <small class="form-text text-muted">${blockData.helpText}</small>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(html, blockData);
    }

    addTextBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('text-block', existingIds);
        const blockData = { id, type: 'text-block', text: '' };
        const newTextBlockHTML = `
            <div class="mb-3 text-block block" data-id="${id}" data-type="text-block">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="text-block">
                <span class="drag-handle"></span>
                <textarea class="form-control" name="blocks[][text]" rows="3" placeholder="Enter your text here..."></textarea>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(newTextBlockHTML, blockData);
    }

    addDividerBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('divider-block', existingIds);
        const blockData = { id, type: 'divider' };
        const newDividerBlockHTML = `
            <div class="mb-3 divider-block block" data-id="${id}" data-type="divider">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="divider">
                <span class="drag-handle"></span>
                <hr>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(newDividerBlockHTML, blockData);
    }

    addNumberQuestionBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('number-question', existingIds);
        const blockData = {
            id,
            type: 'number',
            label: 'Number Question',
            helpText: 'Help text goes here.',
            required: false,
            min: null,
            max: null,
            step: null,
        };
        const html = `
            <div class="mb-3 question number-question block" data-id="${id}" data-type="number">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="number">
                <input type="hidden" name="blocks[][label]" value="${blockData.label}">
                <input type="hidden" name="blocks[][helpText]" value="${blockData.helpText}">
                <input type="hidden" name="blocks[][required]" value="${blockData.required}">
                <input type="hidden" name="blocks[][min]" value="">
                <input type="hidden" name="blocks[][max]" value="">
                <input type="hidden" name="blocks[][step]" value="">
                <span class="drag-handle"></span>
                <label class="form-label">${blockData.label}</label>
                <input type="number" class="form-control" placeholder="Enter a number">
                <small class="form-text text-muted">${blockData.helpText}</small>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(html, blockData);
    }

    addEmailQuestionBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('email-question', existingIds);
        const blockData = {
            id,
            type: 'email',
            label: 'Email Question',
            helpText: 'Help text goes here.',
            required: false,
        };
        const html = `
            <div class="mb-3 question email-question block" data-id="${id}" data-type="email">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="email">
                <input type="hidden" name="blocks[][label]" value="${blockData.label}">
                <input type="hidden" name="blocks[][helpText]" value="${blockData.helpText}">
                <input type="hidden" name="blocks[][required]" value="${blockData.required}">
                <span class="drag-handle"></span>
                <label class="form-label">${blockData.label}</label>
                <input type="email" class="form-control" placeholder="Enter an email">
                <small class="form-text text-muted">${blockData.helpText}</small>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(html, blockData);
    }

    addDateQuestionBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('date-question', existingIds);
        const blockData = {
            id,
            type: 'date',
            label: 'Date Question',
            helpText: 'Help text goes here.',
            required: false,
        };
        const html = `
            <div class="mb-3 question date-question block" data-id="${id}" data-type="date">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="date">
                <input type="hidden" name="blocks[][label]" value="${blockData.label}">
                <input type="hidden" name="blocks[][helpText]" value="${blockData.helpText}">
                <input type="hidden" name="blocks[][required]" value="${blockData.required}">
                <span class="drag-handle"></span>
                <label class="form-label">${blockData.label}</label>
                <input type="date" class="form-control">
                <small class="form-text text-muted">${blockData.helpText}</small>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(html, blockData);
    }

    addMatrixSingleQuestionBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('matrix-single-question', existingIds);
        const blockData = {
            id,
            type: 'matrix-single',
            label: 'Matrix (Single-select) Question',
            helpText: 'Help text goes here.',
            required: false,
            rows: ['Row 1'],
            cols: ['Column 1']
        };
        const html = `
            <div class="mb-3 question matrix-single-question block" data-id="${id}" data-type="matrix-single">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="matrix-single">
                <input type="hidden" name="blocks[][label]" value="${blockData.label}">
                <input type="hidden" name="blocks[][helpText]" value="${blockData.helpText}">
                <input type="hidden" name="blocks[][required]" value="${blockData.required}">
                <input type="hidden" name="blocks[][rows]" value='${JSON.stringify(blockData.rows)}'>
                <input type="hidden" name="blocks[][cols]" value='${JSON.stringify(blockData.cols)}'>
                <span class="drag-handle"></span>
                <label class="form-label">${blockData.label}</label>
                <small class="form-text text-muted">${blockData.helpText}</small>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(html, blockData);
    }

    addMatrixMultiQuestionBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('matrix-multi-question', existingIds);
        const blockData = {
            id,
            type: 'matrix-multi',
            label: 'Matrix (Multi-select) Question',
            helpText: 'Help text goes here.',
            required: false,
            rows: ['Row 1'],
            cols: ['Column 1']
        };
        const html = `
            <div class="mb-3 question matrix-multi-question block" data-id="${id}" data-type="matrix-multi">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="matrix-multi">
                <input type="hidden" name="blocks[][label]" value="${blockData.label}">
                <input type="hidden" name="blocks[][helpText]" value="${blockData.helpText}">
                <input type="hidden" name="blocks[][required]" value="${blockData.required}">
                <input type="hidden" name="blocks[][rows]" value='${JSON.stringify(blockData.rows)}'>
                <input type="hidden" name="blocks[][cols]" value='${JSON.stringify(blockData.cols)}'>
                <span class="drag-handle"></span>
                <label class="form-label">${blockData.label}</label>
                <small class="form-text text-muted">${blockData.helpText}</small>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(html, blockData);
    }

    addRankingQuestionBlock() {
        const existingIds = Array.from(document.querySelectorAll('.block')).map(b => b.dataset.id);
        const id = generateUniqueId('ranking-question', existingIds);
        const blockData = {
            id,
            type: 'ranking',
            label: 'Ranking Question',
            helpText: 'Help text goes here.',
            required: false,
            items: ['Item 1', 'Item 2']
        };
        const html = `
            <div class="mb-3 question ranking-question block" data-id="${id}" data-type="ranking">
                <input type="hidden" name="blocks[][id]" value="${id}">
                <input type="hidden" name="blocks[][type]" value="ranking">
                <input type="hidden" name="blocks[][label]" value="${blockData.label}">
                <input type="hidden" name="blocks[][helpText]" value="${blockData.helpText}">
                <input type="hidden" name="blocks[][required]" value="${blockData.required}">
                <input type="hidden" name="blocks[][items]" value='${JSON.stringify(blockData.items)}'>
                <span class="drag-handle"></span>
                <label class="form-label">${blockData.label}</label>
                <small class="form-text text-muted">${blockData.helpText}</small>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="formEditor.removeBlock(this)">Remove</button>
            </div>
        `;
        this.addBlock(html, blockData);
    }

    removeBlock(button) {
        this.history.addState(this.questionsContainer.innerHTML);
        const blockToRemove = button.parentElement;
        this.autosaveManager.addOp({ op: 'remove', blockId: blockToRemove.dataset.id });
        if (blockToRemove === this.selectedBlock) {
            this.inspector.style.display = 'none';
            this.selectedBlock = null;
        }
        blockToRemove.remove();
        this.renderPreview();
        this.renderMockAnswersPanel();
    }

    renderPreview(mockAnswers = {}) {
        const previewPane = document.getElementById('preview-pane');
        previewPane.innerHTML = '';
        const blocks = Array.from(this.questionsContainer.children);
        blocks.forEach(blockEl => {
            const displayLogicInput = blockEl.querySelector('input[name="blocks[][displayLogic]"]');
            let shouldShow = true;
            if (displayLogicInput && displayLogicInput.value) {
                const displayLogic = JSON.parse(displayLogicInput.value);
                if (displayLogic.condition === 'AND') {
                    shouldShow = displayLogic.rules.every(rule => evaluatePredicate(rule, mockAnswers));
                } else {
                    shouldShow = displayLogic.rules.some(rule => evaluatePredicate(rule, mockAnswers));
                }
            }

            if (!shouldShow) {
                return;
            }

            const blockType = blockEl.dataset.type;
            let blockHTML = '';

            if (blockType === 'text-block') {
                const content = blockEl.querySelector('textarea').value;
                blockHTML = `<p>${resolvePlaceholders(content, mockAnswers)}</p>`;
            } else if (blockType === 'divider') {
                blockHTML = '<hr>';
            } else if (blockType === 'text' || blockType === 'multipleChoice' || blockType === 'checkbox' || blockType === 'rating' || blockType === 'number' || blockType === 'email' || blockType === 'date') {
                const label = blockEl.querySelector('.form-label').textContent;
                const helpText = blockEl.querySelector('.form-text').textContent;
                const optionsContainer = blockEl.querySelector('.options-container');

                blockHTML = `<div class="mb-3"><h5>${resolvePlaceholders(label, mockAnswers)}</h5><small class="text-muted">${resolvePlaceholders(helpText, mockAnswers)}</small>`;
                if (optionsContainer) {
                    blockHTML += '<div class="mt-2">';
                    const options = Array.from(optionsContainer.children);
                    options.forEach(optionEl => {
                        const optionLabel = optionEl.querySelector('label').textContent.trim();
                        const optionType = blockType === 'multipleChoice' ? 'radio' : 'checkbox';
                        blockHTML += `
                            <div class="form-check">
                                <input class="form-check-input" type="${optionType}" disabled>
                                <label class="form-check-label">${resolvePlaceholders(optionLabel, mockAnswers)}</label>
                            </div>
                        `;
                    });
                    blockHTML += '</div>';
                } else {
                     blockHTML += `<input type="text" class="form-control" disabled>`
                }
                blockHTML += `</div>`
            }

            if(blockHTML) {
                previewPane.insertAdjacentHTML('beforeend', blockHTML);
            }
        });

        const nextPageInfo = document.createElement('div');
        nextPageInfo.className = 'mt-3 p-3 bg-light';
        nextPageInfo.innerHTML = `<strong>Next Page:</strong> <span id="next-page-name">End of Survey</span>`;
        previewPane.appendChild(nextPageInfo);
    }

    renderMockAnswersPanel() {
        const mockAnswersPanel = document.getElementById('mock-answers-panel');
        mockAnswersPanel.innerHTML = '';
        const blocks = Array.from(this.questionsContainer.children);
        blocks.forEach(blockEl => {
            if (blockEl.classList.contains('question')) {
                const id = blockEl.dataset.id;
                const label = blockEl.querySelector('.form-label')?.textContent.trim();
                const mockAnswerHTML = `
                    <div class="mb-3">
                        <label for="mock-answer-${id}" class="form-label">${label}</label>
                        <input type="text" id="mock-answer-${id}" class="form-control mock-answer-input" data-question-id="${id}">
                    </div>
                `;
                mockAnswersPanel.insertAdjacentHTML('beforeend', mockAnswerHTML);
            }
        });
    }

    serializeForm() {
        const title = document.getElementById('title').value;
        const questions = Array.from(this.questionsContainer.children).map(blockEl => {
            const question = {
                id: blockEl.dataset.id,
                type: blockEl.dataset.type,
                text: blockEl.querySelector('.form-label')?.textContent.trim(),
                helpText: blockEl.querySelector('.form-text')?.textContent.trim(),
                required: blockEl.querySelector('input[name="blocks[][required]"]')?.value === 'true',
            };
            if (question.type === 'single-choice' || question.type === 'multiple-choice') {
                question.shuffle = blockEl.querySelector('input[name="blocks[][shuffle]"]')?.value === 'true';
                question.options = Array.from(blockEl.querySelectorAll('.options-container .form-check')).map(optionEl => ({
                    text: optionEl.querySelector('label').textContent.trim(),
                    pinned: optionEl.querySelector('input[type="hidden"]')?.dataset.pinned === 'true'
                }));
            }
            if (question.type === 'matrix-single' || question.type === 'matrix-multi') {
                const rowsValue = blockEl.querySelector('input[name="blocks[][rows]"]').value;
                const colsValue = blockEl.querySelector('input[name="blocks[][cols]"]').value;
                question.rows = (rowsValue && rowsValue.startsWith('[')) ? JSON.parse(rowsValue) : [];
                question.cols = (colsValue && colsValue.startsWith('[')) ? JSON.parse(colsValue) : [];
            }
            if (question.type === 'ranking') {
                const itemsValue = blockEl.querySelector('input[name="blocks[][items]"]').value;
                question.items = (itemsValue && itemsValue.startsWith('[')) ? JSON.parse(itemsValue) : [];
            }
            if (question.type === 'file-upload') {
                const allowedFileTypesValue = blockEl.querySelector('input[name="blocks[][allowedFileTypes]"]').value;
                question.allowedFileTypes = (allowedFileTypesValue && allowedFileTypesValue.startsWith('[')) ? JSON.parse(allowedFileTypesValue) : [];
                question.maxFileSize = blockEl.querySelector('input[name="blocks[][maxFileSize]"]').value;
            }
            if (question.type === 'consent-checkbox') {
                question.consentText = blockEl.querySelector('input[name="blocks[][consentText]"]').value;
            }
            return question;
        });

        return {
            id: this.formId,
            title,
            pages: [{
                id: 'page-1',
                title: 'Page 1',
                blocks: [
                    {
                        id: 'block-1',
                        questions: questions
                    }
                ]
            }]
        };
    }

    async validateForm() {
        const surveyData = this.serializeForm();
        const response = await fetch('/api/surveys/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': this.csrfToken
            },
            body: JSON.stringify(surveyData)
        });

        const result = await response.json();
        if (response.ok) {
            document.getElementById('errorContainer').style.display = 'none';
            alert('Validation successful!');
        } else {
            this.displayErrors(result.errors);
        }
    }

    async publishForm() {
        const surveyData = this.serializeForm();
        const response = await fetch('/api/surveys/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': this.csrfToken
            },
            body: JSON.stringify(surveyData)
        });

        const result = await response.json();
        if (response.ok) {
            document.getElementById('errorContainer').style.display = 'none';
            this.openPublishModal(surveyData);
        } else {
            this.displayErrors(result.errors);
        }
    }

    displayErrors(errors) {
        const errorContainer = document.getElementById('errorContainer');
        const errorList = document.getElementById('errorList');
        errorContainer.style.display = 'block';
        errorList.innerHTML = '';
        errors.forEach(error => {
            const li = document.createElement('li');
            const path = error.path.join(' -> ');
            li.textContent = `${path}: ${error.message}`;
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => {
                this.jumpToError(error.path);
            });
            errorList.appendChild(li);
        });
    }

    jumpToError(path) {
        const questionIndex = path[3];
        const blockId = this.serializeForm().pages[0].blocks[0].questions[questionIndex].id;
        const blockEl = document.querySelector(`.block[data-id="${blockId}"]`);
        if (blockEl) {
            blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            blockEl.style.transition = 'background-color 0.5s';
            blockEl.style.backgroundColor = '#f8d7da';
            setTimeout(() => {
                blockEl.style.backgroundColor = '';
            }, 2000);
        }
    }

    openPublishModal(surveyData) {
        const jsonSnapshot = document.getElementById('jsonSnapshot');
        jsonSnapshot.textContent = JSON.stringify(surveyData, null, 2);
        const publishModal = new bootstrap.Modal(document.getElementById('publishModal'));
        publishModal.show();
    }

    saveVersion() {
        const name = prompt('Enter a name for this version:');
        if (name) {
            const surveyData = this.serializeForm();
            this.snapshotManager.saveSnapshot(name, surveyData);
            this.renderVersionsMenu();
        }
    }

    renderVersionsMenu() {
        const versionsDropdown = document.getElementById('versions-dropdown');
        const existingItems = versionsDropdown.querySelectorAll('.snapshot-item');
        existingItems.forEach(item => item.remove());

        const snapshots = this.snapshotManager.getSnapshots();
        for (const name in snapshots) {
            const snapshot = snapshots[name];
            const li = document.createElement('li');
            li.className = 'snapshot-item dropdown-item-text d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <div>
                    <strong>${snapshot.name}</strong><br>
                    <small class="text-muted">${new Date(snapshot.timestamp).toLocaleString()}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-primary me-2 restore-btn" data-name="${snapshot.name}">Restore</button>
                    <button class="btn btn-sm btn-secondary compare-btn" data-name="${snapshot.name}">Compare</button>
                    <button class="btn btn-sm btn-danger delete-snapshot-btn" data-name="${snapshot.name}">X</button>
                </div>
            `;
            versionsDropdown.appendChild(li);
        }
    }

    openCompareModal(snapshotName) {
        const compareModal = new bootstrap.Modal(document.getElementById('compareModal'));
        document.getElementById('compare-snapshot-name').textContent = snapshotName;
        const compareWithSelect = document.getElementById('compare-with-select');
        compareWithSelect.innerHTML = '<option value="">Select a snapshot...</option>';
        const snapshots = this.snapshotManager.getSnapshots();
        for (const name in snapshots) {
            if (name !== snapshotName) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                compareWithSelect.appendChild(option);
            }
        }
        compareWithSelect.onchange = () => {
            const otherSnapshotName = compareWithSelect.value;
            if (otherSnapshotName) {
                const snapshotA = this.snapshotManager.getSnapshot(snapshotName).data;
                const snapshotB = this.snapshotManager.getSnapshot(otherSnapshotName).data;
                const results = compareSnapshots(snapshotA, snapshotB);
                document.getElementById('compare-results').innerHTML = `
                    <p><strong>Added:</strong> ${results.added}</p>
                    <p><strong>Removed:</strong> ${results.removed}</p>
                    <p><strong>Changed:</strong> ${results.changed}</p>
                `;
            } else {
                document.getElementById('compare-results').innerHTML = '';
            }
        };
        compareModal.show();
    }

    restoreSnapshot(data) {
        this.questionsContainer.innerHTML = '';
        document.getElementById('title').value = data.title;

        const questions = data.pages[0].blocks[0].questions;
        questions.forEach(q => {
            let addBlockFn;
            switch (q.type) {
                case 'short-text':
                    addBlockFn = this.addShortTextQuestionBlock.bind(this);
                    break;
                case 'single-choice':
                    addBlockFn = this.addSingleChoiceQuestionBlock.bind(this);
                    break;
                case 'multiple-choice':
                    addBlockFn = this.addMultipleChoiceQuestionBlock.bind(this);
                    break;
                case 'text-block':
                    addBlockFn = this.addTextBlock.bind(this);
                    break;
                case 'divider':
                    addBlockFn = this.addDividerBlock.bind(this);
                    break;
                case 'number':
                    addBlockFn = this.addNumberQuestionBlock.bind(this);
                    break;
                case 'email':
                    addBlockFn = this.addEmailQuestionBlock.bind(this);
                    break;
                case 'date':
                    addBlockFn = this.addDateQuestionBlock.bind(this);
                    break;
                case 'matrix-single':
                    addBlockFn = this.addMatrixSingleQuestionBlock.bind(this);
                    break;
                case 'matrix-multi':
                    addBlockFn = this.addMatrixMultiQuestionBlock.bind(this);
                    break;
                case 'ranking':
                    addBlockFn = this.addRankingQuestionBlock.bind(this);
                    break;
                case 'file-upload':
                    addBlockFn = this.addFileUploadQuestionBlock.bind(this);
                    break;
                case 'consent-checkbox':
                    addBlockFn = this.addConsentCheckboxBlock.bind(this);
                    break;
            }
            if (addBlockFn) {
                addBlockFn();
                const newBlock = this.questionsContainer.lastElementChild;
                newBlock.dataset.id = q.id;
                newBlock.querySelector('input[name="blocks[][id]"]').value = q.id;
                if (q.label) newBlock.querySelector('.form-label').textContent = q.label;
                if (q.helpText) newBlock.querySelector('.form-text').textContent = q.helpText;
                if (q.required) newBlock.querySelector('input[name="blocks[][required]"]').value = q.required;
                if (q.shuffle) newBlock.querySelector('input[name="blocks[][shuffle]"]').value = q.shuffle;
                if (q.options) {
                    const optionsContainer = newBlock.querySelector('.options-container');
                    optionsContainer.innerHTML = '';
                    q.options.forEach(opt => {
                        this.addOption(opt);
                    });
                }
                if (q.rows) newBlock.querySelector('input[name="blocks[][rows]"]').value = JSON.stringify(q.rows);
                if (q.cols) newBlock.querySelector('input[name="blocks[][cols]"]').value = JSON.stringify(q.cols);
                if (q.items) newBlock.querySelector('input[name="blocks[][items]"]').value = JSON.stringify(q.items);
            }
        });
        this.renderPreview();
        this.renderMockAnswersPanel();
    }

    undo() {
        const previousState = this.history.undo();
        if (previousState) {
            this.questionsContainer.innerHTML = previousState;
        }
    }

    redo() {
        const nextState = this.history.redo();
        if (nextState) {
            this.questionsContainer.innerHTML = nextState;
        }
    }

    applyTheme(theme) {
        const previewPane = document.getElementById('preview-pane');
        previewPane.style.setProperty('--ee-primary', theme.primaryColor);
        previewPane.style.setProperty('--ee-border-radius', `${theme.borderRadius}px`);
        previewPane.style.setProperty('--ee-font-family', theme.fontFamily);
    }

    openTranslationModal() {
        const strings = this.extractStrings();
        const tableBody = document.getElementById('translation-table-body');
        tableBody.innerHTML = '';
        for (const key in strings) {
            const row = document.createElement('tr');
            const en = strings[key].en || '';
            const es = strings[key].es || '';
            row.innerHTML = `
                <td>${key}</td>
                <td><input type="text" class="form-control" value="${en}"></td>
                <td><input type="text" class="form-control" value="${es}"></td>
            `;
            if (!es) {
                row.classList.add('table-danger');
            }
            tableBody.appendChild(row);
        }
        const translationModal = new bootstrap.Modal(document.getElementById('translationModal'));
        translationModal.show();
    }

    exportStringsAsCsv() {
        const strings = this.extractStrings();
        let csvContent = "data:text/csv;charset=utf-8,key,en,es\n";
        for (const key in strings) {
            const en = strings[key].en || '';
            const es = strings[key].es || '';
            csvContent += `${key},"${en.replace(/"/g, '""')}","${es.replace(/"/g, '""')}"\n`;
        }
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "translations.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    extractStrings() {
        const strings = {};
        const surveyData = this.serializeForm();

        // Form title
        strings['title'] = { en: surveyData.title, es: '' };

        // Page titles
        surveyData.pages.forEach((page, pageIndex) => {
            strings[`page_${pageIndex}_title`] = { en: page.title, es: '' };
        });

        // Question labels, help text, and options
        surveyData.pages.forEach((page, pageIndex) => {
            page.blocks.forEach((block, blockIndex) => {
                block.questions.forEach((question, questionIndex) => {
                    const keyPrefix = `p${pageIndex}_b${blockIndex}_q${questionIndex}`;
                    strings[`${keyPrefix}_label`] = { en: question.text, es: '' };
                    if (question.helpText) {
                        strings[`${keyPrefix}_helpText`] = { en: question.helpText, es: '' };
                    }
                    if (question.options) {
                        question.options.forEach((option, optionIndex) => {
                            strings[`${keyPrefix}_option${optionIndex}`] = { en: option.text, es: '' };
                        });
                    }
                    if (question.rows) {
                        question.rows.forEach((row, rowIndex) => {
                            strings[`${keyPrefix}_row${rowIndex}`] = { en: row, es: '' };
                        });
                    }
                    if (question.cols) {
                        question.cols.forEach((col, colIndex) => {
                            strings[`${keyPrefix}_col${colIndex}`] = { en: col, es: '' };
                        });
                    }
                    if (question.items) {
                        question.items.forEach((item, itemIndex) => {
                            strings[`${keyPrefix}_item${itemIndex}`] = { en: item, es: '' };
                        });
                    }
                    if (question.consentText) {
                        strings[`${keyPrefix}_consentText`] = { en: question.consentText, es: '' };
                    }
                });
            });
        });

        return strings;
    }
}

if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('editForm');
        if (form) {
            const formId = form.action.split('/').pop();
            const csrfToken = form.querySelector('input[name="_csrf"]').value;
            window.formEditor = new FormEditor(formId, csrfToken);
        }
    });
}

module.exports = FormEditor;
