// BeHappy API server entry point.
//   npm run server        (from the project root)
//
// Holds the OpenAI key, meters AI usage, and verifies Flitt TEST payments.

import { createApp } from './app.mjs';
import { assertTestModeOnly, config, describeConfig, LEAKED_ROOT_KEY_PRESENT } from './config.mjs';
import { Store } from './store.mjs';

assertTestModeOnly();

const store = new Store(config.dataDir);
store.pruneResponseOwners();

const app = createApp({ store, config });

app.listen(config.port, () => {
  const info = describeConfig();
  console.log('BeHappy API listening', info);
  if (LEAKED_ROOT_KEY_PRESENT) {
    console.warn(
      '[security] The project-root .env still contains EXPO_PUBLIC_API_KEY. That OpenAI key was committed to git ' +
        'and shipped in a public web bundle. It is NOT used by this server or the app: revoke it at ' +
        'platform.openai.com/api-keys and delete the line.'
    );
  }
  if (!config.openai.apiKey) console.warn('[ai] OPENAI_API_KEY is missing: AI features will answer 503.');
  console.log('[payments] Flitt TEST mode only. Test card: 4444 5555 1111 6666 (approved, no 3-D Secure).');
});
