import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const tempDir = mkdtempSync(join(tmpdir(), 'mag-as-prisma-'));
const dbPath = join(tempDir, 'ci.db').replace(/\\/g, '/');
const env = { ...process.env, DATABASE_URL: `file:${dbPath}` };
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(args) {
  const result = spawnSync(npx, ['--no-install', 'prisma', ...args], {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

try {
  run(['validate']);
  run(['migrate', 'deploy']);
  console.log('Prisma OK: schema valid and migrations deploy on a fresh SQLite database.');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
