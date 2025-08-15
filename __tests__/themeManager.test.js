const ThemeManager = require('../public/js/themeManager');

describe('ThemeManager', () => {
    let themeManager;

    beforeEach(() => {
        themeManager = new ThemeManager();
        localStorage.clear();
    });

    test('should save and load a theme', () => {
        const theme = {
            primaryColor: '#ff0000',
            borderRadius: '10',
            fontFamily: 'serif'
        };
        themeManager.saveTheme(theme);
        const loadedTheme = themeManager.loadTheme();
        expect(loadedTheme).toEqual(theme);
    });

    test('should return null if no theme is saved', () => {
        const loadedTheme = themeManager.loadTheme();
        expect(loadedTheme).toBeNull();
    });
});
