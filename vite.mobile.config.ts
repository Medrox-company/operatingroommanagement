import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appStorePreview = process.env.VITE_APP_STORE_PREVIEW === '1'
    || env.VITE_APP_STORE_PREVIEW === '1';
  return {
    root: fileURLToPath(new URL('./mobile', import.meta.url)),
    // The screenshot-only preview is self-contained. Do not copy production
    // public assets (including the service worker and 3D models) into it.
    publicDir: appStorePreview
      ? false
      : fileURLToPath(new URL('./public', import.meta.url)),
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        ...(appStorePreview ? {
          '/main.tsx': fileURLToPath(new URL('./mobile/preview-main.tsx', import.meta.url)),
        } : {}),
        '@': fileURLToPath(new URL('./', import.meta.url)),
        'next/dynamic': fileURLToPath(new URL('./mobile/next-dynamic.tsx', import.meta.url)),
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || ''),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''),
      'process.env.NEXT_PUBLIC_APP_URL': JSON.stringify(env.NEXT_PUBLIC_APP_URL || 'https://www.operatingroom.eu'),
    },
    build: {
      outDir: fileURLToPath(new URL('./mobile-dist', import.meta.url)),
      emptyOutDir: true,
      // Source maps are useful locally, but they needlessly disclose the
      // application source when bundled into a production iOS/Android app.
      sourcemap: mode !== 'production',
      target: 'es2022',
    },
  };
});
