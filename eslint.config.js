import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

// Monorepo root for typescript-eslint. client/** has its own eslint config;
// this file governs server/ and wasm/.
const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  globalIgnores(['**/dist/**', '**/build/**', '**/coverage/**', '**/node_modules/**']),

  // Plain JS files (e.g. config files) — Node environment.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
  },

  // TypeScript — non-type-checked recommended rules, scoped to TS files.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { tsconfigRootDir },
    },
    rules: {
      // TypeScript itself reports undefined symbols.
      'no-undef': 'off',
      // Follow the underscore-prefix convention for intentionally unused vars.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // Server + WASM + tooling configs run in Node.
  {
    files: ['server/**/*.ts', 'wasm/**/*.ts', '**/*.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Client runs in the browser and uses React hooks.
  {
    files: ['client/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: { ...globals.browser } },
  },

  // Turn off rules that conflict with Prettier formatting (must be last).
  prettier,
]);
