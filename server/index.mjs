// BeHappy API server entry point.
//   npm run server        production-style start
//   npm run server:dev    development: file watching + --dev-tools
//
// Holds the OpenAI key, meters AI usage, verifies Flitt TEST payments, and
// serves the community, professional and admin APIs plus real-time rooms.

import http from 'node:http';

import { createApp } from './app.mjs';
import { createClock } from './clock.mjs';
import { warnIfClockIsWrong } from './clockCheck.mjs';
import { assertTestModeOnly, config, describeConfig, LEAKED_ROOT_KEY_PRESENT, productionProblems } from './config.mjs';
import { createDatabase } from './db/index.mjs';
import { importJsonStore } from './db/import-json.mjs';
import { migrate } from './db/migrate.mjs';
import { createMailer } from './notify/mailer.mjs';
import { FEATURE_MODULES, startFeatureServices } from './features.mjs';

assertTestModeOnly();

const problems = productionProblems();
for (const w of problems.warnings) console.warn(`[config] ${w}`);
if (problems.blocking.length) {
  for (const b of problems.blocking) console.error(`[config] ${b}`);
  console.error('[config] Refusing to start in production with the problems above.');
  process.exit(1);
}

const db = await createDatabase({ url: config.databaseUrl, dataDir: config.dataDir });
await migrate(db, { log: (m) => console.log(m) });
await importJsonStore(db, config.dataDir, { log: (m) => console.log(m) });

const clock = createClock({ allowOffset: config.devTools });
const mailer = createMailer({ driver: config.mail.driver, from: config.mail.from, resendApiKey: config.mail.resendApiKey, isProduction: config.isProduction });
const app = createApp({ db, config, clock, mailer, extend: FEATURE_MODULES });
const server = http.createServer(app);
const services = await startFeatureServices({ server, app, deps: app.locals.deps });

server.listen(config.port, () => {
  console.log('BeHappy API listening', describeConfig());
  if (LEAKED_ROOT_KEY_PRESENT) {
    console.warn(
      '[security] The project-root .env still contains EXPO_PUBLIC_API_KEY. That OpenAI key was committed to git ' +
        'and shipped in a public web bundle. It is NOT used by this server or the app: revoke it at ' +
        'platform.openai.com/api-keys and delete the line.'
    );
  }
  if (!config.openai.apiKey) console.warn('[ai] OPENAI_API_KEY is missing: AI features will answer 503.');
  if (config.devTools) console.warn('[dev] Development tools are ON (dev outbox, movable clock). Never use --dev-tools in production.');
  console.log('[payments] Flitt TEST mode only. Test card: 4444 5555 1111 6666 (approved, no 3-D Secure).');
  // A wrong clock silently breaks Web Push to iPhones, reminders and expiry times.
  warnIfClockIsWrong(config.flitt.apiBase).catch(() => {});
});

const shutdown = async () => {
  server.close();
  await services.stop?.();
  await db.close().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
