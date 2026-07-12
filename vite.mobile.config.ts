import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: fileURLToPath(new URL('./mobile', import.meta.url)),
    publicDir: fileURLToPath(new URL('./public', import.meta.url)),
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
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
      sourcemap: true,
      target: 'es2022',
    },
  };
});
