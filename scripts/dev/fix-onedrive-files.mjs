// OneDrive can mark files in a newly made folder so that Node's directory
// listing reports them as symbolic links, though they are ordinary files.
// Metro (Expo SDK 58) skips links when it scans the project, so such a screen
// "doesn't exist" (Unable to resolve module …). This finds those files and
// recreates them with the same content.
//   npm run fix:files            fix
//   npm run fix:files -- --check  only list them (exit 1 when any)
import fs from 'node:fs';
import path from 'node:path';

const check = process.argv.includes('--check');
const SKIP = new Set(['node_modules', '.git', '.expo', 'dist', 'web-build', 'qa-shots', '.server-data']);
const found = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP.has(e.name)) walk(p);
    } else if (e.isSymbolicLink()) {
      // A real link stays a link; only "links" that are files on disk are the problem.
      if (fs.lstatSync(p).isFile()) found.push(p);
    }
  }
}

walk(process.cwd());
if (!found.length) {
  console.log('No files are misreported as links.');
  process.exit(0);
}
for (const p of found) {
  if (check) {
    console.log(`listed as a link: ${p}`);
    continue;
  }
  const tmp = `${p}.fixtmp`;
  fs.copyFileSync(p, tmp);
  fs.unlinkSync(p);
  fs.renameSync(tmp, p);
  console.log(`recreated: ${p}`);
}
if (check) process.exit(1);
console.log(`Done (${found.length}). Restart Expo if it was running: npx expo start --clear`);
