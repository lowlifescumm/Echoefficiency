module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    'mongodb-memory-server': '<rootDir>/__tests__/fileMock.js',
    'redis-memory-server': '<rootDir>/__tests__/fileMock.js',
    'mongoose': '<rootDir>/__tests__/fileMock.js',
    './services/queueService': '<rootDir>/__tests__/fileMock.js',
  },
  testMatch: [
    '**/__tests__/accessibility.test.js',
    '**/__tests__/commandPalette.test.js',
    '**/__tests__/formEditor.test.js',
    '**/__tests__/historyManager.test.js',
    '**/__tests__/pageManager.test.js',
    '**/__tests__/placeholderResolver.test.js',
    '**/__tests__/themeManager.test.js',
    '**/__tests__/translation.test.js',
  ],
}
