/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // Override bundler moduleResolution (Next.js default) to node,
          // since Jest uses CommonJS module resolution at runtime.
          moduleResolution: 'node',
        },
      },
    ],
  },
}

module.exports = config
