import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginJest from 'eslint-plugin-jest';

export default tseslint.config(
  {
    files: ['**/*.ts'],
    ignores: ['**/*.d.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
    ],
  },
  {
    files: ['*.test.ts'],
    ...eslintPluginJest.configs['flat/recommended'],
  },
  eslintConfigPrettier,
  {
    name: 'Project config',
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: 'module',
    },
    ignores: ['*.d.ts'],
  },
);

