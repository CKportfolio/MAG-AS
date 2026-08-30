import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const repoRoot = resolve(appRoot, '..');
const roots = [join(appRoot, 'src'), join(appRoot, 'prisma'), join(appRoot, 'tests'), join(repoRoot, 'launcher.js')];
const files = [];

function collect(target) {
  const stat = statSync(target);
  if (stat.isFile()) {
    if (target.endsWith('.js') || target.endsWith('.mjs')) files.push(target);
    return;
  }
  for (const name of readdirSync(target)) collect(join(target, name));
}

for (const root of roots) collect(root);
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
console.log(`Syntax OK: ${files.length} JavaScript files checked.`);
