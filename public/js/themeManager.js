class ThemeManager {
    constructor() {
        this.storageKey = 'form-theme';
    }

    saveTheme(theme) {
        localStorage.setItem(this.storageKey, JSON.stringify(theme));
    }

    loadTheme() {
        const theme = localStorage.getItem(this.storageKey);
        return theme ? JSON.parse(theme) : null;
    }
}

module.exports = ThemeManager;
