import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes.js';
import { getDb } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function startServer() {
  const app = express();

  // Parse JSON payloads
  app.use(express.json());

  // Mount API Router
  app.use('/api', apiRouter);

  // Initialize DB eagerly
  await getDb();

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[OpenApt Server] Vite dev server middleware mounted.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[OpenApt Server] Production static assets mounted from dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OpenApt Server] Running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[OpenApt Server] Failed to start:', err);
  process.exit(1);
});
