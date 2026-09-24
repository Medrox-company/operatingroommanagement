import type { ReactNode } from 'react'
import Link from 'next/link'
import styles from './legal-pages.module.css'

type LegalShellProps = {
  activePage: 'privacy' | 'support'
  children: ReactNode
}

export function LegalShell({ activePage, children }: LegalShellProps) {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#hlavni-obsah">
        Přeskočit na obsah
      </a>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/" aria-label="Operatingroom Manager – otevřít aplikaci">
            Operatingroom <span>Manager</span>
          </Link>
          <nav className={styles.nav} aria-label="Veřejné informace">
            <Link
              className={`${styles.navLink} ${activePage === 'privacy' ? styles.navLinkActive : ''}`}
              href="/privacy"
              aria-current={activePage === 'privacy' ? 'page' : undefined}
            >
              Soukromí
            </Link>
            <Link
              className={`${styles.navLink} ${activePage === 'support' ? styles.navLinkActive : ''}`}
              href="/support"
              aria-current={activePage === 'support' ? 'page' : undefined}
            >
              Podpora
            </Link>
          </nav>
        </header>
        <main id="hlavni-obsah">{children}</main>
        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} Medrox s.r.o. · Operatingroom Manager</span>
          <span>
            <Link href="/privacy">Ochrana soukromí</Link>
            {' · '}
            <Link href="/support">Uživatelská podpora</Link>
          </span>
        </footer>
      </div>
    </div>
  )
}
