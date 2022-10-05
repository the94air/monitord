module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'esnext'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
};
