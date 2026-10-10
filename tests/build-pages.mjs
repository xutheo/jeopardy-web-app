import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', 'dist-pages'], {
  stdio: 'inherit', env: { ...process.env, VITE_BASE_PATH: '/quiz/', VITE_SERVER_URL: 'http://127.0.0.1:3199' }
});
process.exit(result.status ?? 1);
