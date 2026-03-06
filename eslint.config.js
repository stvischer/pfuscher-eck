import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  // Base JS rules for all files
  {
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Server – Node.js ESM
  {
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // Client – Vue 3
  ...pluginVue.configs['flat/recommended'].map((config) => ({
    ...config,
    files: ['client/**/*.{js,vue}'],
  })),
  {
    files: ['client/**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
    },
  },

  // Disable ESLint rules that conflict with Prettier
  prettier,

  // Ignore generated/build output
  {
    ignores: ['**/node_modules/**', '**/dist/**', 'mysql_data/**', 'redis_data/**'],
  },
];
