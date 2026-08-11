import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed as its own standalone Vercel project (see VITE_API_BASE_URL in
// src/api/client.js), so it's served from its own domain root rather than
// same-origin under the backend's old /admin mount - base stays the default.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
