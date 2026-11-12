/** Jest 配置：@swc/jest 转译（TS7 无 JS API，不能用 ts-jest）；uuid 14 为纯 ESM 需一并转译 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(ts|js)$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript' },
          target: 'es2020',
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!uuid/)'],
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
};
