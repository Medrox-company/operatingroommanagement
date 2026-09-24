import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  KeyRound,
  Laptop,
  LifeBuoy,
  Mail,
  ShieldAlert,
} from 'lucide-react'
import { LegalShell } from '../legal-shell'
import styles from '../legal-pages.module.css'

export const metadata: Metadata = {
  title: 'Uživatelská podpora | Operatingroom Manager',
  description:
    'Kontakt a praktická pomoc s přihlášením, přístupovými právy a používáním aplikace Operatingroom Manager.',
  robots: { index: true, follow: true },
}

export default function SupportPage() {
  return (
    <LegalShell activePage="support">
      <section className={styles.hero} aria-labelledby="support-title">
        <div>
          <p className={styles.eyebrow}>Uživatelská podpora</p>
          <h1 className={styles.title} id="support-title">
            Pomoc, když ji potřebujete
          </h1>
          <p className={styles.lead}>
            Rychlé kroky pro řešení přihlášení, přístupových práv a provozních potíží. Pokud problém
            přetrvá, napište nám — pomůže stručný popis bez citlivých údajů.
          </p>
        </div>
        <div className={styles.heroMeta}>
          <strong>Operatingroom Manager</strong>
          Podpora aplikace Medrox s.r.o.
          <br />
          info@medrox.ca
        </div>
      </section>

      <div className={styles.contactCard}>
        <div>
          <h2>Kontaktujte podporu</h2>
          <p>
            Uveďte název zdravotnického zařízení, používané zařízení a přibližný čas problému. Nikdy
            neposílejte heslo ani zdravotní údaje pacienta.
          </p>
        </div>
        <a className={styles.contactButton} href="mailto:info@medrox.ca?subject=Podpora%20Operatingroom%20Manager">
          <Mail aria-hidden="true" size={18} />
          info@medrox.ca
        </a>
      </div>

      <div className={styles.supportGrid} style={{ marginTop: '1rem' }}>
        <section className={styles.supportCard}>
          <KeyRound className={styles.supportIcon} aria-hidden="true" size={25} strokeWidth={1.7} />
          <h2>Nemohu se přihlásit</h2>
          <ol>
            <li>Zkontrolujte pracovní e-mail a heslo a ověřte, že zařízení má připojení k internetu.</li>
            <li>Pokud je vyžadováno vícefaktorové ověření, použijte aktuální kód z ověřovací aplikace.</li>
            <li>
              Při zablokovaném účtu, zapomenutém heslu nebo změně oprávnění kontaktujte správce aplikace ve
              vašem zdravotnickém zařízení.
            </li>
            <li>Pokud se přihlášení stále nedaří, napište podpoře přibližný čas a znění chyby.</li>
          </ol>
        </section>

        <section className={styles.supportCard}>
          <LifeBuoy className={styles.supportIcon} aria-hidden="true" size={25} strokeWidth={1.7} />
          <h2>Nevidím zařízení nebo modul</h2>
          <p>
            Zobrazené nemocniční zařízení, moduly a podmoduly závisejí na roli a oprávnění přiděleném
            správcem. Obraťte se nejprve na administrátora vašeho zařízení. Podpora nemění oprávnění bez
            souhlasu odpovědné osoby.
          </p>
        </section>

        <section className={styles.supportCard}>
          <Laptop className={styles.supportIcon} aria-hidden="true" size={25} strokeWidth={1.7} />
          <h2>Kompatibilita a běžné potíže</h2>
          <p>
            Mobilní aplikace je určena pro iPhone a iPad s iOS 15 nebo novějším. Webovou aplikaci používejte
            v aktuální verzi běžného moderního prohlížeče. Při nestandardním chování:
          </p>
          <ul>
            <li>ověřte stabilitu nemocniční sítě nebo Wi-Fi,</li>
            <li>aplikaci zcela zavřete a znovu otevřete,</li>
            <li>nainstalujte dostupnou aktualizaci aplikace nebo systému,</li>
            <li>poznamenejte si čas, obrazovku a kroky vedoucí k chybě.</li>
          </ul>
        </section>

        <section className={styles.supportCard}>
          <ShieldAlert className={styles.supportIcon} aria-hidden="true" size={25} strokeWidth={1.7} />
          <h2>Bezpečnostní událost</h2>
          <p>
            Při podezření na zneužití účtu, neoprávněný přístup nebo únik dat okamžitě informujte správce
            vašeho zdravotnického zařízení a napište na info@medrox.ca. Do předmětu uveďte{' '}
            <strong>Bezpečnostní incident</strong>. Heslo neprodleně změňte, pokud je to možné.
          </p>
        </section>

        <section className={`${styles.supportCard} ${styles.supportCardWide}`}>
          <AlertTriangle className={styles.supportIcon} aria-hidden="true" size={25} strokeWidth={1.7} />
          <h2>Aplikace nenahrazuje urgentní komunikaci</h2>
          <p>
            V naléhavé situaci postupujte podle interních krizových a klinických pravidel zdravotnického
            zařízení. E-mailová podpora není určena pro řízení akutní péče ani pro hlášení, které vyžaduje
            okamžitou reakci.
          </p>
        </section>
      </div>

      <div className={styles.notice} role="note" style={{ marginTop: '1rem', marginBottom: 0 }}>
        <ShieldAlert className={styles.noticeIcon} aria-hidden="true" size={22} strokeWidth={1.8} />
        <div>
          Informace o zpracování osobních a zdravotních údajů najdete v{' '}
          <Link className={styles.inlineLink} href="/privacy">
            zásadách ochrany soukromí
          </Link>
          . <ArrowRight aria-hidden="true" size={14} style={{ display: 'inline', verticalAlign: '-0.12em' }} />
        </div>
      </div>
    </LegalShell>
  )
}
