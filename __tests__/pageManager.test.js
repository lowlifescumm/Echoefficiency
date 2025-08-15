const PageManager = require('../public/js/pageManager.js');

describe('PageManager', () => {
    let pageManager;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="page-content-container"></div>
            <div id="page-settings-panel"></div>
            <ul id="page-list"></ul>
            <button id="add-page-btn"></button>
            <button id="rename-page-btn"></button>
            <button id="delete-page-btn"></button>
            <button id="addQuestionBtn"></button>
            <div id="questionsContainer"></div>
        `;
        global.localStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
        };
        pageManager = new PageManager();
    });

    test('should move page up when ArrowUp is pressed', () => {
        pageManager.pages = [{ name: 'Page 1', questions: [] }, { name: 'Page 2', questions: [] }];
        pageManager.selectedPageIndex = 1;

        pageManager.handleKeyPress({ key: 'ArrowUp', preventDefault: () => {} });

        expect(pageManager.pages).toEqual([{ name: 'Page 2', questions: [] }, { name: 'Page 1', questions: [] }]);
        expect(pageManager.selectedPageIndex).toBe(0);
    });

    test('should move page down when ArrowDown is pressed', () => {
        pageManager.pages = [{ name: 'Page 1', questions: [] }, { name: 'Page 2', questions: [] }];
        pageManager.selectedPageIndex = 0;

        pageManager.handleKeyPress({ key: 'ArrowDown', preventDefault: () => {} });

        expect(pageManager.pages).toEqual([{ name: 'Page 2', questions: [] }, { name: 'Page 1', questions: [] }]);
        expect(pageManager.selectedPageIndex).toBe(1);
    });

    test('should not move page up if it is the first page', () => {
        pageManager.pages = [{ name: 'Page 1', questions: [] }, { name: 'Page 2', questions: [] }];
        pageManager.selectedPageIndex = 0;

        pageManager.handleKeyPress({ key: 'ArrowUp', preventDefault: () => {} });

        expect(pageManager.pages).toEqual([{ name: 'Page 1', questions: [] }, { name: 'Page 2', questions: [] }]);
        expect(pageManager.selectedPageIndex).toBe(0);
    });

    test('should not move page down if it is the last page', () => {
        pageManager.pages = [{ name: 'Page 1', questions: [] }, { name: 'Page 2', questions: [] }];
        pageManager.selectedPageIndex = 1;

        pageManager.handleKeyPress({ key: 'ArrowDown', preventDefault: () => {} });

        expect(pageManager.pages).toEqual([{ name: 'Page 1', questions: [] }, { name: 'Page 2', questions: [] }]);
        expect(pageManager.selectedPageIndex).toBe(1);
    });
});
