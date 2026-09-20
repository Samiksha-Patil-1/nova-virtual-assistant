import { defineConfig, loadEnv } from 'vite';
import handler from './api/neural.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env.HUGGINGFACE_API_KEY = env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY;

  return {
    server: {
      port: 5173,
      open: false,
      host: true
    },
    plugins: [
      {
        name: 'neural-api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/neural', (req, res) => {
            handler(req, res);
          });
        }
      }
    ]
  };
});
