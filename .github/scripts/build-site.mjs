import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, '_site');
const allowedExtensions = new Set(['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico']);
const excludedFiles = new Set(['config.js', 'config.example.js']);
const excludedDirectories = new Set(['.git', '.github', 'backups', 'data', '_site', 'outputs', 'work']);

const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
  throw new Error('SUPABASE_URL GitHub secret değeri eksik veya geçersiz.');
}
if (!supabaseAnonKey || /service_role/i.test(supabaseAnonKey)) {
  throw new Error('SUPABASE_ANON_KEY eksik veya güvensiz. Yalnızca publishable/anon anahtarı kullanın.');
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

async function copyDirectory(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    if (entry.isFile() && excludedFiles.has(entry.name)) continue;
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyDirectory(sourcePath, destinationPath);
    else if (entry.name === '.nojekyll' || allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
      await cp(sourcePath, destinationPath);
    }
  }
}

await copyDirectory(root, target);
await writeFile(path.join(target, 'config.js'), `window.POLATPRO_CONFIG = ${JSON.stringify({
  supabaseUrl,
  supabaseAnonKey
}, null, 2)};\n`, 'utf8');

console.log(`GitHub Pages paketi hazır: ${target}`);

