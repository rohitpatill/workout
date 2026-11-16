import { defineConfig } from 'vite';

// host: true exposes the dev server on the local network so a phone on the same Wi-Fi can open it.
export default defineConfig({
  server: { host: true, port: 5180, strictPort: true },
  preview: { host: true, port: 5180, strictPort: true },
});
