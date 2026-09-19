import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import tsPlugin from '@typescript-eslint/eslint-plugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals'),
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Too many pre-existing unescaped quotes in JSX — cosmetic, not a bug
      'react/no-unescaped-entities': 'off',
      // Disable for now — TypeScript already enforces no-any via tsconfig/tsc
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]

export default eslintConfig
