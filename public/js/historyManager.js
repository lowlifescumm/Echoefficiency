class HistoryManager {
    constructor(limit = 50) {
        this.history = [null];
        this.pointer = 0;
        this.limit = limit;
    }

    addState(state) {
        // If we are not at the end of the history, we need to remove the future states
        if (this.pointer < this.history.length - 1) {
            this.history = this.history.slice(0, this.pointer + 1);
        }

        this.history.push(state);
        this.pointer++;

        if (this.history.length > this.limit) {
            this.history.shift();
            this.pointer--;
        }
    }

    undo() {
        if (this.pointer > 0) {
            this.pointer--;
            return this.history[this.pointer];
        }
        return null;
    }

    redo() {
        if (this.pointer < this.history.length - 1) {
            this.pointer++;
            return this.history[this.pointer];
        }
        return null;
    }
}

module.exports = HistoryManager;
