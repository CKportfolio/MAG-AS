require('dotenv/config');
const express = require('express');
const path = require('path');
const net = require('net');
const cors = require('cors');
const { initDatabase } = require('./db-init');

const materialsRouter = require('./routes/materials');
const groupsRouter = require('./routes/groups');
const productsRouter = require('./routes/products');
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');
const dashboardRouter = require('./routes/dashboard');
const exportRouter = require('./routes/export');
const importRouter = require('./routes/import');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PREFERRED_PORT = parseInt(process.env.PORT) || 3001;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort(startPort) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error('Nie znaleziono wolnego portu');
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/materials', materialsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/products', productsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/export', exportRouter);
app.use('/api/import', importRouter);

// Serve frontend static files (for production/portable build)
const publicDir = path.join(__dirname, '..', 'public');
const fs = require('fs');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.use(errorHandler);

(async () => {
  await initDatabase();
  const PORT = await findFreePort(PREFERRED_PORT);
  app.listen(PORT, () => {
    console.log(`MAG-AS Backend running on http://localhost:${PORT}`);
  });
})();
