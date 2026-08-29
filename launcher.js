/**
 * launcher.js — Starts the MAG-AS server, waits for the "running" message,
 * then opens the browser at the correct URL.
 */
const { spawn } = require('child_process');
const { exec } = require('child_process');
const path = require('path');

const appDir = path.join(__dirname, 'app');
const nodeExe = path.join(__dirname, 'node.exe');

// Use the same node.exe that launched this script (works for both dev and portable)
const serverProcess = spawn(process.execPath, [path.join(appDir, 'src', 'index.js')], {
  cwd: appDir,
  env: { ...process.env, DATABASE_URL: 'file:../data/magas.db' },
  stdio: ['inherit', 'pipe', 'inherit'],
});

let browserOpened = false;

serverProcess.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);

  if (!browserOpened) {
    const match = text.match(/MAG-AS Backend running on (http:\/\/localhost:\d+)/);
    if (match) {
      browserOpened = true;
      const url = match[1];
      console.log(`\nOtwieranie przegladarki: ${url}\n`);
      // Open browser cross-platform (Windows)
      exec(`start "" "${url}"`);
    }
  }
});

serverProcess.on('exit', (code) => {
  process.exit(code || 0);
});

// Forward Ctrl+C
process.on('SIGINT', () => {
  serverProcess.kill('SIGINT');
});
