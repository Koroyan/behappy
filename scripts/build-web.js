#!/usr/bin/env node
/**
 * Resilient web build script for Vercel.
 * Attempts local expo binary first, then falls back to `npx expo`.
 */
const { execSync } = require('child_process');

function run(cmd) {
  console.log('\n▶', cmd, '\n');
  execSync(cmd, { stdio: 'inherit' });
}

function hasLocalExpo() {
  try {
    execSync('node ./node_modules/expo/bin/cli.js --help', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

try {
  if (hasLocalExpo()) {
    // Use direct node invocation to avoid PATH resolution issues
    run('node ./node_modules/expo/bin/cli.js export -p web');
  } else {
    // Fallback to npx (will install temporarily if missing)
    run('npx expo export -p web');
  }
  console.log('\n✅ Expo web export completed successfully.');
} catch (e) {
  console.error('\n❌ Expo export failed:', e.message);
  process.exit(1);
}
