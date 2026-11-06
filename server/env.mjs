// Loads server/.env before any other module reads configuration.
//
// Import this module first (config.mjs does). ES modules evaluate their
// imports before their own body, so a module that read process.env at import
// time used to run before dotenv had loaded server/.env, and silently got the
// defaults instead of the configured values.
//
// server/.env overrides inherited variables on purpose: a stale value in the
// OS environment (for example an old, revoked OPENAI_API_KEY) must not win
// over the key configured for this server. Hosts without a server/.env
// (containers, PaaS) use real environment variables.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_DIR = path.join(SERVER_DIR, '..');

const envFile = path.join(SERVER_DIR, '.env');
if (fs.existsSync(envFile)) dotenv.config({ path: envFile, override: true, quiet: true });

/**
 * The project-root .env once held the OpenAI key as EXPO_PUBLIC_API_KEY. That
 * key was committed to git and shipped in a public web bundle, so it must be
 * revoked. The server never reads it; this only reports whether the line is
 * still there, so the owner can remove it.
 */
export function rootEnvHasLeakedKey() {
  try {
    const rootEnv = path.join(PROJECT_DIR, '.env');
    if (!fs.existsSync(rootEnv)) return false;
    return Object.prototype.hasOwnProperty.call(dotenv.parse(fs.readFileSync(rootEnv)), 'EXPO_PUBLIC_API_KEY');
  } catch {
    return false;
  }
}
