// Metro: Expo's defaults, minus folders that change constantly during
// development and are never part of the app — the dev database (.server-data,
// written on every API request), QA screenshots (qa-shots) and the web build
// (dist). Watching them made Metro's web server rendering fail now and then
// with "Requiring unknown module …" while the browser journeys were running.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ignored = ['.server-data', 'qa-shots', 'dist'].map((dir) => new RegExp(`^${escape(path.resolve(__dirname, dir))}[/\\\\].*`));

config.resolver.blockList = [...[].concat(config.resolver.blockList || []), ...ignored];

module.exports = config;
