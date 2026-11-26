import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = name => readFile(path.join(root, 'src', name), 'utf8');
const [template, css, ...modules] = await Promise.all([
  source('template.html'), source('styles.css'),
  ...['model.mjs', 'scene.mjs', 'adapter.mjs', 'app.mjs'].map(source)
]);
const js = modules.map(code => code.replace(/^import\s+[\s\S]*?;\r?\n/gm, '').replace(/^export /gm, '')).join('\n\n');
const html = template.replace('/* OFFICE_STYLES */', () => css).replace('/* OFFICE_SCRIPT */', () => js.replace(/<\/script/gi, '<\\/script'));
await writeFile(path.join(root, 'index.html'), html);
console.log(`Built standalone index.html (${Math.round(Buffer.byteLength(html) / 1024)} KB; no external assets).`);
