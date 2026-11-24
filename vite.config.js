import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration.
// When you run `netlify dev`, Netlify starts Vite for you and serves the
// serverless functions at /.netlify/functions/* on the same origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
