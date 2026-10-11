import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// This QA fixture never loads production environment files, public assets, auth or database clients.
export default defineConfig({
  root: here('./'), cacheDir: here('../../output/acute-vite-cache'), envDir: false, publicDir: false,
  plugins: [react()],
  resolve: { alias: [
    { find: /(?:^|.*\/)hooks\/useAcuteRequests(?:\.ts)?$/, replacement: here('./hook.ts') },
  ] },
  server: { host: '127.0.0.1', port: 4189, strictPort: true, hmr: false, fs: { allow: [here('../../')] } },
  build: { outDir: here('../../output/acute-preview'), emptyOutDir: true },
});
