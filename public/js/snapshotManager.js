class SnapshotManager {
    constructor(storageKey = 'formSnapshots') {
        this.storageKey = storageKey;
        this.snapshots = this.getSnapshots();
    }

    saveSnapshot(name, data) {
        if (!name) {
            return;
        }
        this.snapshots[name] = {
            name,
            timestamp: new Date().toISOString(),
            data,
        };
        this._saveToLocalStorage();
    }

    getSnapshots() {
        try {
            const snapshots = localStorage.getItem(this.storageKey);
            return snapshots ? JSON.parse(snapshots) : {};
        } catch (e) {
            console.error('Error reading snapshots from localStorage', e);
            return {};
        }
    }

    getSnapshot(name) {
        return this.snapshots[name];
    }

    deleteSnapshot(name) {
        delete this.snapshots[name];
        this._saveToLocalStorage();
    }

    _saveToLocalStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.snapshots));
        } catch (e) {
            console.error('Error saving snapshots to localStorage', e);
        }
    }
}

module.exports = SnapshotManager;
