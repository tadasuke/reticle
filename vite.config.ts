import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** API が develop 中に書き込むアセット。監視対象にすると保存のたびにフルリロードする */
const API_WRITTEN_ASSETS = [
  '**/assets/real-friends/**',
  '**/assets/friends/**',
  '**/assets/buddies/**',
  '**/assets/images/**',
];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: API_WRITTEN_ASSETS,
    },
    proxy: {
      '/debug-ingest': {
        target: 'http://127.0.0.1:7250/ingest/989a1cc2-ba98-4ec6-9f19-23ab7217ba35',
        changeOrigin: true,
        rewrite: () => '',
      },
    },
  },
});
