/**
 * Jednorázový skript — nastaví bezpečné (scrypt) hashe hesel pro demo účty.
 * Spouští se přes `node scripts/10-seed-password-hashes.mjs` (v0 executeScript).
 *
 * Bezpečnostní poznámky:
 *  - Hashe se ukládají ve formátu `scrypt$v1$<salt-hex>$<hash-hex>` a jsou
 *    kompatibilní s helperem lib/auth/password.ts.
 *  - Pokud uživatel ještě neexistuje, skript ho vytvoří (INSERT), jinak jen
 *    aktualizuje password_hash (UPDATE).
 *  - Hesla jsou jen pro demo / startovací účely. V produkci je okamžitě změňte.
 */
import { scrypt as scryptCb, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const scrypt = promisify(scryptCb);

const DEMO_USERS = [
  { email: 'admin@nemocnice.cz',      password: 'admin123',  role: 'admin',      name: 'Administrátor' },
  { email: 'user@nemocnice.cz',       password: 'user123',   role: 'user',       name: 'Uživatel' },
  { email: 'aro@nemocnice.cz',        password: 'aro123',    role: 'aro',        name: 'ARO oddělení' },
  { email: 'cos@nemocnice.cz',        password: 'cos123',    role: 'cos',        name: 'Centrální operační sály' },
  { email: 'management@nemocnice.cz', password: 'mgmt123',   role: 'management', name: 'Management' },
  { email: 'primar@nemocnice.cz',     password: 'primar123', role: 'primar',     name: 'Primariát' },
];

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt$v1$${salt}$${derived.toString('hex')}`;
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY.');
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('[seed] Pripravuji %d uzivatelu...', DEMO_USERS.length);

  for (const u of DEMO_USERS) {
    const password_hash = await hashPassword(u.password);

    // Zkontroluj, zda uživatel existuje
    const { data: existing } = await supabase
      .from('app_users')
      .select('id')
      .eq('email', u.email)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('app_users')
        .update({
          password_hash,
          role: u.role,
          name: u.name,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) {
        console.error('[seed] UPDATE %s selhal: %s', u.email, error.message);
      } else {
        console.log('[seed] UPDATE %s OK', u.email);
      }
    } else {
      const { error } = await supabase
        .from('app_users')
        .insert({
          email: u.email,
          name: u.name,
          role: u.role,
          is_active: true,
          password_hash,
        });
      if (error) {
        console.error('[seed] INSERT %s selhal: %s', u.email, error.message);
      } else {
        console.log('[seed] INSERT %s OK', u.email);
      }
    }
  }

  console.log('[seed] Hotovo. Demo hesla zustavaji stejna, ale nyni jsou hashovana v DB.');
}

main().catch((e) => {
  console.error('[seed] FAILED:', e);
  process.exit(1);
});
