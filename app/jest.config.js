Yeah, oh yeah, six what do you see when scanning fails to start? Second option approach in it git add initialize a new C one of target domainmodule.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/?(*.)+(spec|test).(ts|tsx|js)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    '**/*.(ts|tsx)',
    '!**/node_modules/**',
    '!**/types/**',
    '!**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
};
