import stylistic from '@stylistic/eslint-plugin'
import tsEslint from 'typescript-eslint'
import js from '@eslint/js'

export default [
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  stylistic.configs['recommended-flat'],
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsEslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@stylistic/indent': ['error', 'tab', { SwitchCase: 1 }],
      '@stylistic/no-tabs': 'off',
      '@stylistic/jsx-indent-props': ['error', 'tab'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
]
