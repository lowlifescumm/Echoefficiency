const HistoryManager = require('./historyManager');
const generateUniqueId = require('./idGenerator');
const validateNavigationGraph = require('./graphValidator');

class PageManager {
    constructor() {
        this.history = new HistoryManager();
        this.pages = [];
        this.selectedPageIndex = -1;
        this.pageContentContainer = document.getElementById('page-content-container');
        this.pageSettingsPanel = document.getElementById('page-settings-panel');
        this.questionsContainer = document.getElementById('questionsContainer');
        this.pageList = document.getElementById('page-list');
        this.addPageBtn = document.getElementById('add-page-btn');
        this.renamePageBtn = document.getElementById('rename-page-btn');
        this.deletePageBtn = document.getElementById('delete-page-btn');
        this.addQuestionBtn = document.getElementById('addQuestionBtn');

        this.addPageBtn.addEventListener('click', () => this.addPage());
        this.renamePageBtn.addEventListener('click', () => this.renamePage());
        this.deletePageBtn.addEventListener('click', () => this.deletePage());
        this.pageList.addEventListener('click', (e) => this.handlePageSelection(e));
        this.addQuestionBtn.addEventListener('click', () => this.addQuestion());
        window.addEventListener('keydown', (e) => this.handleKeyPress(e));

        this.loadFromLocalStorage();
        this.history.addState(JSON.parse(JSON.stringify(this.pages)));
        this.render();
    }

    addPage() {
        this.history.addState(JSON.parse(JSON.stringify(this.pages)));
        const existingIds = this.pages.map(p => p.id);
        const pageName = `Page ${this.pages.length + 1}`;
        const id = generateUniqueId(pageName, existingIds);
        this.pages.push({ id, name: pageName, questions: [] });
        this.selectedPageIndex = this.pages.length - 1;
        this.saveToLocalStorage();
        this.render();
    }

    renamePage() {
        if (this.selectedPageIndex === -1) return;
        const newName = prompt('Enter new page name:', this.pages[this.selectedPageIndex].name);
        if (newName !== null) {
            this.history.addState(JSON.parse(JSON.stringify(this.pages)));
            this.pages[this.selectedPageIndex].name = newName;
            this.saveToLocalStorage();
            this.render();
        }
    }

    deletePage() {
        if (this.selectedPageIndex === -1) return;
        if (confirm('Are you sure you want to delete this page?')) {
            this.history.addState(JSON.parse(JSON.stringify(this.pages)));
            this.pages.splice(this.selectedPageIndex, 1);
            if(this.pages.length === 0){
                this.selectedPageIndex = -1;
            } else if (this.selectedPageIndex >= this.pages.length) {
                this.selectedPageIndex = this.pages.length - 1;
            }
            this.saveToLocalStorage();
            this.render();
        }
    }

    handlePageSelection(e) {
        if (e.target.closest('.page-item')) {
            this.selectedPageIndex = parseInt(e.target.closest('.page-item').dataset.index);
            this.render();
        }
    }

    handleKeyPress(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                this.undo();
            } else if (e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
        } else if (this.selectedPageIndex !== -1) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.selectedPageIndex > 0) {
                    this.history.addState(JSON.parse(JSON.stringify(this.pages)));
                    const temp = this.pages[this.selectedPageIndex];
                    this.pages[this.selectedPageIndex] = this.pages[this.selectedPageIndex - 1];
                    this.pages[this.selectedPageIndex - 1] = temp;
                    this.selectedPageIndex--;
                    this.saveToLocalStorage();
                    this.render();
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.selectedPageIndex < this.pages.length - 1) {
                    this.history.addState(JSON.parse(JSON.stringify(this.pages)));
                    const temp = this.pages[this.selectedPageIndex];
                    this.pages[this.selectedPageIndex] = this.pages[this.selectedPageIndex + 1];
                    this.pages[this.selectedPageIndex + 1] = temp;
                    this.selectedPageIndex++;
                    this.saveToLocalStorage();
                    this.render();
                }
            }
        }
    }

    addQuestion() {
        if (this.selectedPageIndex === -1) return;
        this.history.addState(JSON.parse(JSON.stringify(this.pages)));
        const question = {
            questionText: '',
            questionType: 'text'
        };
        this.pages[this.selectedPageIndex].questions.push(question);
        this.saveToLocalStorage();
        this.renderQuestions();
    }

    removeQuestion(questionIndex) {
        if (this.selectedPageIndex === -1) return;
        this.history.addState(JSON.parse(JSON.stringify(this.pages)));
        this.pages[this.selectedPageIndex].questions.splice(questionIndex, 1);
        this.saveToLocalStorage();
        this.renderQuestions();
    }

    undo() {
        const previousState = this.history.undo();
        if (previousState) {
            this.pages = previousState;
            this.saveToLocalStorage();
            this.render();
        }
    }

    redo() {
        const nextState = this.history.redo();
        if (nextState) {
            this.pages = nextState;
            this.saveToLocalStorage();
            this.render();
        }
    }

    renderQuestions() {
        this.questionsContainer.innerHTML = '';
        if (this.selectedPageIndex === -1) return;

        const questions = this.pages[this.selectedPageIndex].questions;
        questions.forEach((question, index) => {
            const questionHTML = `
                <div class="mb-3 question" id="question${index + 1}">
                    <label for="questionText${index + 1}" class="form-label">Question Text</label>
                    <input type="text" class="form-control" id="questionText${index + 1}" name="questions[${index}][questionText]" value="${question.questionText}" required>
                    <label for="questionType${index + 1}" class="form-label">Question Type</label>
                    <select class="form-select" id="questionType${index + 1}" name="questions[${index}][questionType]" required>
                        <option value="text" ${question.questionType === 'text' ? 'selected' : ''}>Text</option>
                        <option value="multipleChoice" ${question.questionType === 'multipleChoice' ? 'selected' : ''}>Multiple Choice</option>
                    </select>
                    <button type="button" class="btn btn-danger removeQuestionBtn" onclick="pageManager.removeQuestion(${index})">Remove Question</button>
                </div>
            `;
            this.questionsContainer.insertAdjacentHTML('beforeend', questionHTML);
        });
    }

    renderPageSettings() {
        const pageSettingsContent = document.getElementById('page-settings-content');
        if (!pageSettingsContent) return;
        pageSettingsContent.innerHTML = `
            <h5>'Next' Page Rules</h5>
            <div id="next-rules-container"></div>
            <button type="button" id="add-next-rule-btn" class="btn btn-secondary mt-2">Add Rule</button>
            <hr>
            <div class="mb-3">
                <label for="default-next-page" class="form-label">Default Next Page</label>
                <select id="default-next-page" class="form-select"></select>
            </div>
        `;

        document.getElementById('add-next-rule-btn').addEventListener('click', () => this.addNextRule());
        pageSettingsContent.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-rule-btn')) {
                this.removeNextRule(e.target.parentElement);
            }
        });
        pageSettingsContent.addEventListener('change', () => this.updateNextRules());

        this.populateNextRules();
    }

    addNextRule() {
        const ruleTemplate = document.getElementById('next-rule-template');
        const newRule = ruleTemplate.content.cloneNode(true);
        const rulesContainer = document.getElementById('next-rules-container');
        this.populateRuleQuestions(newRule.querySelector('[name="rule-question"]'));
        this.populateRulePages(newRule.querySelector('[name="goto-page"]'));
        rulesContainer.appendChild(newRule);
    }

    removeNextRule(ruleElement) {
        ruleElement.remove();
        this.updateNextRules();
    }

    populateRuleQuestions(selectElement) {
        selectElement.innerHTML = '<option value="">Select a question...</option>';
        const questions = this.pages[this.selectedPageIndex].questions;
        questions.forEach(q => {
            const option = document.createElement('option');
            option.value = q.id;
            option.textContent = q.questionText;
            selectElement.appendChild(option);
        });
    }

    populateRulePages(selectElement) {
        selectElement.innerHTML = '<option value="">Select a page...</option>';
        this.pages.forEach(p => {
            if (p.id !== this.pages[this.selectedPageIndex].id) {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.name;
                selectElement.appendChild(option);
            }
        });
    }

    populateNextRules() {
        const page = this.pages[this.selectedPageIndex];
        if (!page.nextRules) return;

        document.getElementById('default-next-page').value = page.nextRules.default || '';
        const rulesContainer = document.getElementById('next-rules-container');
        rulesContainer.innerHTML = '';
        page.nextRules.rules.forEach(ruleData => {
            const ruleTemplate = document.getElementById('next-rule-template');
            const newRule = ruleTemplate.content.cloneNode(true);
            this.populateRuleQuestions(newRule.querySelector('[name="rule-question"]'));
            this.populateRulePages(newRule.querySelector('[name="goto-page"]'));
            newRule.querySelector('[name="rule-question"]').value = ruleData.questionId;
            newRule.querySelector('[name="rule-operator"]').value = ruleData.operator;
            newRule.querySelector('[name="rule-value"]').value = ruleData.value;
            newRule.querySelector('[name="goto-page"]').value = ruleData.goto;
            rulesContainer.appendChild(newRule);
        });
    }

    updateNextRules() {
        const defaultNextPage = document.getElementById('default-next-page').value;
        const ruleElements = document.querySelectorAll('#next-rules-container .next-rule');
        const rules = Array.from(ruleElements).map(ruleEl => ({
            questionId: ruleEl.querySelector('[name="rule-question"]').value,
            operator: ruleEl.querySelector('[name="rule-operator"]').value,
            value: ruleEl.querySelector('[name="rule-value"]').value,
            goto: ruleEl.querySelector('[name="goto-page"]').value,
        }));

        const newNextRules = {
            default: defaultNextPage,
            rules: rules,
        };

        const tempPages = JSON.parse(JSON.stringify(this.pages));
        tempPages[this.selectedPageIndex].nextRules = newNextRules;

        const validationResult = validateNavigationGraph(tempPages);
        if (!validationResult.valid) {
            alert(`Validation Error: ${validationResult.error}`);
            return;
        }

        this.history.addState(JSON.parse(JSON.stringify(this.pages)));
        this.pages[this.selectedPageIndex].nextRules = newNextRules;
        this.saveToLocalStorage();
    }

    render() {
        this.pageList.innerHTML = '';
        this.pages.forEach((page, index) => {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item ${index === this.selectedPageIndex ? 'active' : ''}`;
            pageItem.dataset.index = index;
            let warningHTML = '';
            if (!page.name) {
                warningHTML = '<span class="badge bg-danger ms-2">Missing Title</span>';
            }
            pageItem.innerHTML = `<span class="page-item-name">${page.name || 'Untitled Page'}</span> ${warningHTML}`;
            this.pageList.appendChild(pageItem);
        });

        if (this.selectedPageIndex !== -1) {
            this.pageContentContainer.style.display = 'block';
            this.pageSettingsPanel.style.display = 'block';
            this.renderQuestions();
            this.renderPageSettings();
        } else {
            this.pageContentContainer.style.display = 'none';
            this.pageSettingsPanel.style.display = 'none';
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('formPages', JSON.stringify(this.pages));
    }

    loadFromLocalStorage() {
        const pages = localStorage.getItem('formPages');
        if (pages) {
            this.pages = JSON.parse(pages);
            if (this.pages.length > 0) {
                this.selectedPageIndex = 0;
            }
        }
    }
}

let pageManager;
document.addEventListener('DOMContentLoaded', () => {
    pageManager = new PageManager();
});

module.exports = PageManager;
