import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'dist');
const DEST = path.join(__dirname, '..', 'backend', 'public', 'admin');

if (!fs.existsSync(SRC)) {
  console.error(`Build output not found at ${SRC} - run "npm run build" first.`);
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
fs.cpSync(SRC, DEST, { recursive: true });
console.log(`Copied ${SRC} -> ${DEST}`);
