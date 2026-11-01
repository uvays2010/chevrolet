import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const children = [];
function start(label, args) {
  const child = spawn(process.execPath, args, { cwd: root, env: process.env, stdio: 'inherit' });
  children.push(child);
  child.on('exit', code => {
    if (code && code !== 0) {
      console.error(`[${label}] stopped with exit code ${code}`);
      shutdown(code);
    }
  });
}
let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 150);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
start('API', ['server/index.mjs']);
start('Vite', ['node_modules/vite/bin/vite.js']);
