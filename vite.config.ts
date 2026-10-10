import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ base: process.env.VITE_BASE_PATH || '/', plugins: [react()], server: { fs: { deny: ['**/.git/**', '**/.env*', '**/data/**', '**/snapshot-*.json', '**/server.lock', '**/server/**', '**/tests/**', '**/.npm-cache/**'] } }, build: { outDir: 'dist' } });
