const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  const dataDir = path.join(__dirname, '..', 'data');
  const dbPath = path.join(dataDir, 'magas.db');

  // Create data directory if missing
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('[DB] Utworzono katalog data/');
  }

  const isNewDb = !fs.existsSync(dbPath);

  // Run Prisma migrations (creates DB file if missing)
  try {
    console.log('[DB] Uruchamiam migracje...');
    const prismaPath = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');
    execSync(`"${process.execPath}" "${prismaPath}" migrate deploy`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    console.log('[DB] Migracje zakończone.');
  } catch (err) {
    console.error('[DB] Błąd migracji:', err.message);
    process.exit(1);
  }

  // Seed on first run
  if (isNewDb) {
    try {
      console.log('[DB] Nowa baza — ładuję dane początkowe...');
      execSync(`"${process.execPath}" prisma/seed.js`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
      console.log('[DB] Dane początkowe załadowane.');
    } catch (err) {
      console.error('[DB] Błąd seedowania:', err.message);
    }
  }
}

module.exports = { initDatabase };
