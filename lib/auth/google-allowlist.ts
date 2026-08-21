/**
 * Seznam Google adres, které smějí do aplikace jako superadministrátor.
 *
 * Seznam je záměrně v proměnné prostředí, ne v databázi. Kdyby se někdo dostal
 * k zápisu do app_users, nemohl by si tím sám otevřít superadmin přístup —
 * musel by navíc změnit konfiguraci nasazení.
 *
 * Formát: adresy oddělené čárkou.
 *   SUPERADMIN_GOOGLE_EMAILS="jedlicka.jaroslav@gmail.com,dalsi@firma.cz"
 *
 * Pouze pro server. Nikdy neimportovat do klientského kódu — proměnná nemá
 * prefix NEXT_PUBLIC_, takže by se do bundlu stejně nedostala, ale import by
 * build zbytečně komplikoval.
 */

export function getSuperadminGoogleEmails(): string[] {
  const raw = process.env.SUPERADMIN_GOOGLE_EMAILS ?? '';
  return raw
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedSuperadminGoogleEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = getSuperadminGoogleEmails();
  // Prázdný seznam znamená "nikdo" — nikoli "kdokoli". Chybějící konfigurace
  // nesmí vést k otevřenému přístupu.
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}

export function isGoogleLoginConfigured(): boolean {
  return getSuperadminGoogleEmails().length > 0;
}
