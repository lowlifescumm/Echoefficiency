const HistoryManager = require('../public/js/historyManager');

describe('HistoryManager', () => {
    let history;

    beforeEach(() => {
        history = new HistoryManager();
    });

    test('should add state to the history', () => {
        history.addState('state1');
        expect(history.history).toEqual([null, 'state1']);
        expect(history.pointer).toBe(1);
    });

    test('should clear the future history when a new state is added', () => {
        history.addState('state1');
        history.addState('state2');
        history.undo();
        history.addState('state3');
        expect(history.history).toEqual([null, 'state1', 'state3']);
        expect(history.pointer).toBe(2);
    });

    test('should not exceed the limit', () => {
        const limit = 5;
        history = new HistoryManager(limit);
        for (let i = 0; i < limit + 5; i++) {
            history.addState(`state${i}`);
        }
        expect(history.history.length).toBe(limit);
        expect(history.history[0]).toBe('state5');
    });

    test('should undo the last state', () => {
        history.addState('state1');
        history.addState('state2');
        const previousState = history.undo();
        expect(previousState).toBe('state1');
        expect(history.pointer).toBe(1);
    });

    test('should return the initial state when undoing the first state', () => {
        history.addState('state1');
        const previousState = history.undo();
        expect(previousState).toBeNull();
    });

    test('should return null when undoing with an empty history', () => {
        const previousState = history.undo();
        expect(previousState).toBeNull();
    });

    test('should redo the last undone state', () => {
        history.addState('state1');
        history.addState('state2');
        history.undo();
        const nextState = history.redo();
        expect(nextState).toBe('state2');
        expect(history.pointer).toBe(2);
    });

    test('should return null when redoing with no future history', () => {
        history.addState('state1');
        const nextState = history.redo();
        expect(nextState).toBeNull();
    });
});
