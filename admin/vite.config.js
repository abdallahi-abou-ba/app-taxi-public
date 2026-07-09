import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: '/admin/' is required because the production build is served by the
// Express backend under app.use('/admin', express.static(...)) - without
// it, built asset URLs would resolve against the site root instead.
export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
