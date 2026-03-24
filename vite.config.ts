import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env variables - include NEXT_PUBLIC_ prefix for Supabase integration a RESEND_ pro email
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_', 'RESEND_']);
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    define: {
      // Expose NEXT_PUBLIC_ vars to import.meta.env
      'import.meta.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || ''),
      'import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''),
      // Expose Resend API key
      'import.meta.env.RESEND_API_KEY': JSON.stringify(env.RESEND_API_KEY || ''),
      'import.meta.env.VITE_RESEND_API_KEY': JSON.stringify(env.VITE_RESEND_API_KEY || env.RESEND_API_KEY || ''),
    }
  };
});
