module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@react-navigation|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|@react-native-async-storage|react-native-svg|react-native-vector-icons)/)',
  ],
};