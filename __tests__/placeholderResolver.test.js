const resolvePlaceholders = require('../public/js/placeholderResolver');

describe('resolvePlaceholders', () => {
    const answers = {
        name: 'John',
        age: '30',
        city: '',
    };

    test('should replace a single placeholder with the corresponding answer', () => {
        const text = 'My name is {{answers.name}}.';
        const expected = 'My name is John.';
        expect(resolvePlaceholders(text, answers)).toBe(expected);
    });

    test('should replace multiple placeholders', () => {
        const text = 'My name is {{answers.name}} and I am {{answers.age}} years old.';
        const expected = 'My name is John and I am 30 years old.';
        expect(resolvePlaceholders(text, answers)).toBe(expected);
    });

    test('should use a fallback for missing answers', () => {
        const text = 'I live in {{answers.country}}.';
        const expected = 'I live in ….';
        expect(resolvePlaceholders(text, answers)).toBe(expected);
    });

    test('should use a fallback for empty answers', () => {
        const text = 'I live in {{answers.city}}.';
        const expected = 'I live in ….';
        expect(resolvePlaceholders(text, answers)).toBe(expected);
    });

    test('should handle a mix of existing and missing answers', () => {
        const text = 'My name is {{answers.name}} and I live in {{answers.country}}.';
        const expected = 'My name is John and I live in ….';
        expect(resolvePlaceholders(text, answers)).toBe(expected);
    });

    test('should return the original text if there are no placeholders', () => {
        const text = 'This is a simple text.';
        expect(resolvePlaceholders(text, answers)).toBe(text);
    });

    test('should handle empty text', () => {
        const text = '';
        expect(resolvePlaceholders(text, answers)).toBe('');
    });

    test('should handle null text', () => {
        const text = null;
        expect(resolvePlaceholders(text, answers)).toBe('');
    });
});
