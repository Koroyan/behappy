// BeHappy API server entry point.
//   npm run server        (from the project root)
//
// Holds the OpenAI key, meters AI usage, and verifies Flitt TEST payments.

import { createApp } from './app.mjs';
import { assertTestModeOnly, config, describeConfig } from './config.mjs';
import { Store } from './store.mjs';

assertTestModeOnly();

const store = new Store(config.dataDir);
store.pruneResponseOwners();

const app = createApp({ store, config });

app.listen(config.port, () => {
  const info = describeConfig();
  console.log('BeHappy API listening', info);
  if (config.openai.keySource === 'legacy project-root .env') {
    console.warn(
      '[security] Using the OpenAI key from the project-root .env (EXPO_PUBLIC_API_KEY). ' +
        'That key was committed to git and shipped in the public web bundle: rotate it at ' +
        'platform.openai.com, put the new key in server/.env as OPENAI_API_KEY, and remove it from the root .env.'
    );
  }
  if (!config.openai.apiKey) console.warn('[ai] OPENAI_API_KEY is missing: AI features will answer 503.');
  console.log('[payments] Flitt TEST mode only. Test card: 4444 5555 1111 6666 (approved, no 3-D Secure).');
});
