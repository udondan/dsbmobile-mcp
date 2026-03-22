// @ts-check
import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base recommended rules
  eslint.configs.recommended,

  // TypeScript recommended + type-checked rules
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Unicorn best practices
  unicorn.configs['flat/recommended'],

  // Prettier (must come last to disable conflicting rules)
  prettierConfig,

  {
    plugins: { prettier: prettierPlugin },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.lint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Prettier as an ESLint rule
      'prettier/prettier': 'error',

      // Deprecation warnings (built into typescript-eslint v8)
      '@typescript-eslint/no-deprecated': 'warn',

      // Enforce explicit return types on public API
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Allow void-returning async functions (common in MCP handlers)
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],

      // Unicorn overrides — some rules are too opinionated for this codebase
      'unicorn/prevent-abbreviations': 'off', // DSB abbreviations are intentional
      'unicorn/no-null': 'off', // null is used by some APIs
      'unicorn/prefer-module': 'off', // we use ESM already
      'unicorn/no-process-exit': 'off', // needed for CLI startup validation
      'unicorn/prefer-top-level-await': 'off', // entry point uses async main()
    },
  },

  // Test files — relax some rules
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // Mock functions are async to satisfy interfaces even without await
      '@typescript-eslint/require-await': 'off',
      // Helper functions defined inside describe() blocks are intentional
      'unicorn/consistent-function-scoping': 'off',
    },
  },

  // Ignore build output and node_modules
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
);
