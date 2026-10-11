import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
// No application credentials or backend modules enter this local design fixture.
export default defineConfig({
  cacheDir: here('../../output/cliniq-vite-cache'), root: here('./'), publicDir: false, envDir: false,
  plugins: [react()],
  resolve: { alias: [
    { find: /.*contexts\/(HospitalContext|AuthContext|WorkflowStatusesContext)$/, replacement: here('./contexts.ts') },
  ] },
  server: { host: '127.0.0.1', port: 4188, strictPort: true, fs: { allow: [here('../../')] } },
  build: { outDir: here('../../output/cliniq-preview'), emptyOutDir: true },
});
