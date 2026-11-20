import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** В режиме разработки отдаём /api/progress прямо из Vite,
 *  с хранилищем в памяти — чтобы синхронизацию можно было проверить без Vercel. */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      process.env.SYNC_DEV_MEMORY = '1';
      server.middlewares.use('/api/progress', async (req, res) => {
        const mod = await server.ssrLoadModule('/api/progress.ts');
        const method = req.method ?? 'GET';
        const handler = mod[method];
        if (typeof handler !== 'function') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
        const request = new Request('http://localhost/api/progress', {
          method,
          headers,
          body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks),
        });
        const response: Response = await handler(request);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    },
  };
}

// Vite — сборщик: в режиме dev он мгновенно показывает изменения,
// а команда build собирает оптимизированные файлы для деплоя.
export default defineConfig({
  plugins: [react(), devApi()],
});
