import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Building2,
  Database,
  Globe2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react'
import { LegalShell } from '../legal-shell'
import styles from '../legal-pages.module.css'

export const metadata: Metadata = {
  title: 'Ochrana soukromí | Operatingroom Manager',
  description:
    'Informace o zpracování osobních a provozních údajů v aplikaci Operatingroom Manager, včetně možných citlivých údajů.',
  robots: { index: true, follow: true },
}

const sections = [
  ['role', 'Kdo údaje zpracovává'],
  ['data', 'Jaké údaje se zpracovávají'],
  ['purpose', 'Účely a právní důvody'],
  ['providers', 'Dodavatelé a předávání'],
  ['retention', 'Doba uchování'],
  ['security', 'Zabezpečení'],
  ['rights', 'Vaše práva'],
] as const

export default function PrivacyPage() {
  return (
    <LegalShell activePage="privacy">
      <section className={styles.hero} aria-labelledby="privacy-title">
        <div>
          <p className={styles.eyebrow}>Ochrana osobních údajů</p>
          <h1 className={styles.title} id="privacy-title">
            Soukromí pod kontrolou
          </h1>
          <p className={styles.lead}>
            Tato stránka vysvětluje, jak se v aplikaci Operatingroom Manager pracuje s údaji o
            uživatelích, personálu a provozu operačních sálů. Popisuje také případy, kdy mohou
            vložené údaje souviset se zdravím, a kam poslat dotaz nebo žádost.
          </p>
        </div>
        <div className={styles.heroMeta}>
          <strong>Aktualizováno 24. září 2026</strong>
          Provozovatel řešení: Medrox s.r.o.
          <br />
          Kontakt: info@medrox.ca
        </div>
      </section>

      <div className={styles.notice} role="note">
        <ShieldCheck className={styles.noticeIcon} aria-hidden="true" size={22} strokeWidth={1.8} />
        <div>
          Operatingroom Manager slouží primárně k řízení provozu sálů, nikoli k vedení zdravotnické
          dokumentace. Některá pole však mohou obsahovat údaje související se zdravím. Osobní údaje
          nepoužíváme k reklamě, prodeji dat ani ke sledování uživatelů napříč aplikacemi a weby.
        </div>
      </div>

      <div className={styles.content}>
        <aside className={styles.sideCard} aria-label="Obsah stránky">
          <p className={styles.sideLabel}>Na této stránce</p>
          <ol className={styles.sideList}>
            {sections.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ol>
        </aside>

        <div className={styles.sections}>
          <section className={styles.section} id="role">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>
                <Building2 aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <h2>Kdo údaje zpracovává</h2>
            </div>
            <p>
              U údajů o personálu, operačním programu a provozu, které do aplikace vkládá zákazník, je
              zpravidla{' '}
              <strong>správcem příslušné zdravotnické zařízení</strong>. Zařízení stanovuje, proč a jak
              dlouho jsou údaje potřeba, komu je zpřístupní a jak vyřídí žádosti subjektů údajů. Medrox
              s.r.o. je při poskytování aplikace zpracovává podle pokynů zařízení, zpravidla v roli
              zpracovatele.
            </p>
            <p>
              Medrox s.r.o. může vystupovat jako samostatný správce u omezených údajů nezbytných pro
              správu zákaznického vztahu, uživatelských účtů, komunikaci s podporou, ochranu služby a
              plnění vlastních právních povinností.
            </p>
          </section>

          <section className={styles.section} id="data">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>
                <Database aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <h2>Jaké údaje se zpracovávají</h2>
            </div>
            <ul>
              <li>
                <strong>Účet a kontakt:</strong> jméno, pracovní e-mail a případně telefon, role,
                přístupová práva, přiřazení ke zdravotnickému zařízení a údaje potřebné k ověření
                přihlášení.
              </li>
              <li>
                <strong>Zařízení a bezpečnost:</strong> technické identifikátory zařízení a relace,
                záznamy o přihlášení, chybách, změnách a bezpečnostních událostech.
              </li>
              <li>
                <strong>Personál a provoz:</strong> přiřazení pracovníků, rozpisy, dostupnost, provozní
                stavy sálů, fáze výkonů, časy a související organizační údaje. Evidence personálu může
                obsahovat i počet dnů pracovní neschopnosti.
              </li>
              <li>
                <strong>Možné citlivé údaje:</strong> některá pole a importy umožňují evidovat údaje o
                pacientovi či bezpečnostním checklistu, například jméno nebo externí identifikátor.
                Současně může údaj o pracovní neschopnosti vypovídat o zdraví zaměstnance. Rozsah
                skutečně vložených údajů závisí na způsobu používání aplikace daným zařízením.
              </li>
              <li>
                <strong>Komunikace s podporou:</strong> obsah zprávy a informace, které nám uživatel
                dobrovolně poskytne při řešení požadavku.
              </li>
            </ul>
            <p>
              Do volných textových polí nevkládejte diagnózy, rodná čísla ani další citlivé údaje,
              pokud to není pro schválený postup zařízení nezbytné. Provozní časové údaje se mohou stát
              osobními údaji, pokud jsou spojeny s konkrétní osobou.
            </p>
          </section>

          <section className={styles.section} id="purpose">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>
                <UserRoundCheck aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <h2>Účely a právní důvody</h2>
            </div>
            <p>Údaje se používají pouze v rozsahu potřebném zejména pro:</p>
            <ul>
              <li>řízení operačních sálů, pracovních postupů, kapacit, personálu a statistik,</li>
              <li>zpřístupnění správných údajů oprávněným uživatelům daného zařízení,</li>
              <li>provoz, diagnostiku, obnovu, zabezpečení a uživatelskou podporu služby,</li>
              <li>správu smluvního vztahu a plnění zákonných povinností.</li>
            </ul>
            <p>
              Právní důvod pro údaje vložené zdravotnickým zařízením, včetně případných zvláštních
              kategorií osobních údajů, určuje zařízení podle svých povinností a postupů. U činností,
              za které odpovídá Medrox s.r.o., jde podle situace zejména o plnění smlouvy, právní
              povinnost nebo oprávněný zájem na bezpečném provozu a podpoře služby.
            </p>
          </section>

          <section className={styles.section} id="providers">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>
                <Globe2 aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <h2>Dodavatelé a mezinárodní předávání</h2>
            </div>
            <p>
              Na provozu se v nezbytném rozsahu mohou podílet prověření poskytovatelé infrastruktury a
              služeb: <strong>Supabase</strong> (databázové a autentizační služby),{' '}
              <strong>Vercel</strong> (provoz webové části), <strong>Resend</strong> (doručování e-mailů)
              a <strong>Google</strong> (přihlášení tam, kde je povoleno). Jejich konkrétní použití se může
              lišit podle konfigurace zákazníka.
            </p>
            <p>
              V závislosti na nastavení jednotlivých služeb může dojít i k předání údajů mimo Evropský
              hospodářský prostor. Informace o konkrétním umístění a použitých zárukách pro dané
              nasazení poskytneme na vyžádání; u údajů vložených zařízením se můžete obrátit také na
              toto zařízení.
            </p>
          </section>

          <section className={styles.section} id="retention">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>
                <Database aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <h2>Doba uchování</h2>
            </div>
            <p>
              Personální, provozní a případné citlivé údaje se uchovávají podle pokynů zdravotnického
              zařízení a jeho právních povinností. Údaje účtu se běžně uchovávají po dobu aktivního
              přístupu a dále jen po dobu potřebnou k vypořádání smluvních, bezpečnostních nebo zákonných
              povinností. Technické záznamy, komunikace podpory a zálohy se uchovávají pouze po nezbytnou
              dobu a následně se mažou nebo přepisují v rámci provozních cyklů.
            </p>
          </section>

          <section className={styles.section} id="security">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>
                <LockKeyhole aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <h2>Zabezpečení a odpovědnost uživatele</h2>
            </div>
            <p>
              Přístup je omezen uživatelskými rolemi a přiřazením ke zdravotnickému zařízení. Používáme
              přiměřená technická a organizační opatření pro ochranu přenosu, přístupu a provozních záznamů.
              Žádný systém však nemůže zaručit absolutní bezpečnost.
            </p>
            <p>
              Uživatel musí chránit své přihlašovací údaje, nesdílet účet a bez prodlení hlásit podezření na
              zneužití. Citlivé údaje neposílejte běžným e-mailem; při kontaktování podpory použijte jen
              minimum údajů nutných k nalezení problému.
            </p>
          </section>

          <section className={styles.section} id="rights">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>
                <Mail aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <h2>Vaše práva a žádosti o výmaz</h2>
            </div>
            <p>
              Podle okolností můžete požádat o přístup, opravu, výmaz nebo omezení zpracování, vznést
              námitku a získat přenositelné údaje. Máte také právo podat stížnost u příslušného dozorového
              úřadu. Rozsah jednotlivých práv závisí na účelu a právním důvodu zpracování.
            </p>
            <p>
              Žádosti týkající se zaměstnance, pacienta, operačního programu nebo jiných údajů vedených
              zdravotnickým zařízením směřujte nejprve na toto zařízení. Žádosti týkající se účtu,
              komunikace se společností Medrox nebo používání služby můžete poslat na{' '}
              <a className={styles.inlineLink} href="mailto:info@medrox.ca">
                info@medrox.ca
              </a>
              . Před vyřízením žádosti může být nutné bezpečně ověřit totožnost a oprávnění žadatele.
            </p>
          </section>

          <div className={styles.contactCard}>
            <div>
              <h2>Máte dotaz k soukromí?</h2>
              <p>
                Napište nám nebo navštivte stránku podpory. Do zprávy nevkládejte zdravotní údaje ani jiné
                citlivé informace, nejsou-li pro vyřízení nezbytné.
              </p>
            </div>
            <Link className={styles.contactButton} href="/support">
              Otevřít podporu
            </Link>
          </div>
        </div>
      </div>
    </LegalShell>
  )
}
