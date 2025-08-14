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
}
