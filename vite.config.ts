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
  },
});
