import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const omitted = new Set(['.git', 'node_modules', '.next', 'dist', 'out', 'output', 'tmp', 'mobile-dist', '.vercel', '.21st', 'ios', 'android']);
const errors = [];
const secretPattern = /\bre_[A-Za-z0-9_-]{20,}|\bsb_secret_[A-Za-z0-9_-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (omitted.has(entry.name) || entry.name.startsWith('.env')) continue;
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) { walk(path); continue; }
    if (!/\.(?:[cm]?[jt]sx?|json|md|ya?ml|sql|toml|html)$/.test(path) || statSync(path).size > 3_000_000) continue;
    const source = readFileSync(path, 'utf8');
    const name = relative(root, path);
    if (secretPattern.test(source)) errors.push(`${name}: možný tajný klíč (hodnota není vypsána)`);
    // Detect privileged legacy JWTs without printing their contents.
    for (const token of source.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
      try { if (JSON.parse(Buffer.from(token[0].split('.')[1], 'base64url').toString()).role === 'service_role') errors.push(`${name}: privilegovaný JWT`); }
      catch { /* Not a JWT payload. */ }
    }
    if (/\b(?:process\.env|import\.meta\.env)\.(?:VITE_|NEXT_PUBLIC_)[A-Z_]*(?:RESEND|SERVICE_ROLE|SERVICE_KEY|SECRET|PASSWORD)/.test(source)) {
      errors.push(`${name}: přístup k veřejné proměnné s tajemstvím`);
    }
  }
}
walk(root);
for (const path of ['.env.local.example', '.env.example']) {
  try { if (secretPattern.test(readFileSync(resolve(root, path), 'utf8'))) errors.push(`${path}: tajemství v ukázkové konfiguraci`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
// Next and Vite load dotenv files after the npm prebuild hook. Inspect names
// locally without emitting values, so public secrets cannot bypass the hook.
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (!entry.isFile() || !/^\.env(?:\..+)?$/.test(entry.name)) continue;
  const source = readFileSync(resolve(root, entry.name), 'utf8');
  for (const assignment of source.matchAll(/^\s*(?:export\s+)?((?:NEXT_PUBLIC_|VITE_)[A-Z0-9_]+)\s*=/gm)) {
    if (/(?:RESEND|SERVICE_ROLE|SERVICE_KEY|SECRET|PASSWORD)/.test(assignment[1])) {
      errors.push(`${entry.name}: veřejná proměnná ${assignment[1]} nesmí obsahovat tajemství`);
    }
  }
}
for (const name of Object.keys(process.env)) {
  if (/^(?:NEXT_PUBLIC_|VITE_).*(?:RESEND|SERVICE_ROLE|SERVICE_KEY|SECRET|PASSWORD)/.test(name) && process.env[name]) {
    errors.push(`${name}: tajemství nesmí být ve veřejné proměnné`);
  }
}
if (errors.length) {
  console.error('Bezpečnostní kontrola zastavila build:\n' + [...new Set(errors)].join('\n'));
  process.exitCode = 1;
} else console.log('Kontrola tajemství a veřejných e-mailových proměnných prošla. Historie Gitu není touto kontrolou pokryta.');
