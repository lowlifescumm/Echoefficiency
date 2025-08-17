module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(bullmq|msgpackr|bson|mongodb))'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '__tests__/accessibility.test.js',
    '__tests__/commandPalette.test.js',
    '__tests__/e2e.spec.js',
    '__tests__/fileMock.js',
    '__tests__/formEditor.test.js',
    '__tests__/historyManager.test.js',
    '__tests__/pageManager.test.js',
    '__tests__/placeholderResolver.test.js',
    '__tests__/themeManager.test.js',
    '__tests__/translation.test.js',
  ],
}
