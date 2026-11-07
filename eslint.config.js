// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // eslint-config-expo 58 adds the React Compiler rules as errors. The
    // compiler is not enabled here (no experiments.reactCompiler), and the
    // flagged patterns (refs holding the latest value for callbacks, Date.now()
    // in render, syncing state from params in effects) work as intended without
    // it. Kept visible as warnings; fix them before turning the compiler on.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
