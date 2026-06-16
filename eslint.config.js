'use strict';

// Flat config (ESLint 9+). Two environments: Node-side scripts and the
// Electron renderer (index.html inline script runs in the browser).
const globals = {
  node: {
    require: 'readonly',
    module: 'writable',
    process: 'readonly',
    console: 'readonly',
    __dirname: 'readonly',
    setTimeout: 'readonly',
    Promise: 'readonly',
  },
  browser: {
    window: 'readonly',
    document: 'readonly',
    console: 'readonly',
    electronAPI: 'readonly',
  },
};

module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
  {
    files: ['main.js', 'preload.js', 'src/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
