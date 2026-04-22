// // jest.config.ts
// import type { Config } from 'jest';

// const config: Config = {
//   moduleFileExtensions: ['js', 'json', 'ts'],
//   rootDir: 'src',
//   testRegex: '.*\\.spec\\.ts$',
//   transform: {
//     '^.+\\.(t|j)s$': [
//       'ts-jest',
//       {
//         tsconfig: {
//           // Override nodenext → commonjs solo para tests
//           module: 'commonjs',
//           moduleResolution: 'node',
//         },
//       },
//     ],
//   },
//   moduleNameMapper: {
//     // Resuelve paths absolutos tipo: src/stripe/stripe.service
//     '^src/(.*)$': '<rootDir>/$1',
//   },
//   collectCoverageFrom: ['**/*.(t|j)s'],
//   coverageDirectory: '../coverage',
//   testEnvironment: 'node',
//   // Para tests que levantan Nest completo (integración)
//   testTimeout: 30000,
// };

// export default config;

import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  testTimeout: 30000,
  // ✅ Agregar esto: Forzar NODE_ENV=test antes de cada test
  setupFiles: ['<rootDir>/../test/setup-jest.ts'],
};

export default config;
