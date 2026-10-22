import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Serves POST /api/ocr in `vite dev` and `vite preview` using the same handler as the Vercel function,
// so the Gemini key stays in the server environment and out of the browser bundle.
function ocrProxy(env: Record<string, string>): Plugin {
  const attach = (server: { middlewares: { use: (fn: any) => void } }) => {
    server.middlewares.use(async (req: any, res: any, next: () => void) => {
      if (!req.url || !req.url.startsWith('/api/ocr')) return next();
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ code: 'METHOD', error: 'Use POST.' }));
      }
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      let body = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      } catch {
        /* handled as bad request below */
      }
      const { handleOcr } = require('./server/ocrCore.cjs');
      const { status, json } = await handleOcr(body, env);
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(json));
    });
  };
  return { name: 'kfs-ocr-proxy', configureServer: attach, configurePreviewServer: attach };
}

export default defineConfig(({ mode }) => {
  // Server-only: loaded for the dev proxy, intentionally NOT exposed through `define`.
  const env = {
    ...loadEnv(mode, '..', ''),
    ...loadEnv(mode, process.cwd(), ''),
    ...(process.env as Record<string, string>)
  };
  return {
    plugins: [react(), ocrProxy(env)],
    server: { port: 5173 }
  };
});
