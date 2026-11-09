// M4-08: instrument the complete Web source tree, including unimported modules.
// Separate Jest coverage runner; legacy node:test tests still run unchanged.
const path = require('node:path');
module.exports = {
  rootDir: path.resolve(__dirname, '../../apps/web'),
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/coverage-*.test.cjs'],
  transform: {
    '^.+\\.tsx?$': [require.resolve('ts-jest'), {
      isolatedModules: true,
      tsconfig: {
        target: 'ES2022', module: 'CommonJS', moduleResolution: 'Node',
        esModuleInterop: true, jsx: 'react-jsx', allowJs: false,
      },
    }],
  },
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx,js,jsx,mjs}', '!<rootDir>/src/**/*.d.ts'],
  coverageProvider: 'babel',
  coverageReporters: ['json-summary'],
  coverageDirectory: path.resolve(__dirname, '../../.workspace/m4-coverage/web-istanbul'),
  clearMocks: true,
  verbose: false,
};
