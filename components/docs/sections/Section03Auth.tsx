"use client";

import {
  DocSection,
  DocSubsection,
  DocCard,
  DocCode,
  DocCodeBlock,
  DocTable,
  DocNotice,
} from "../DocPrimitives";
import { AuthFlowDiagram } from "../diagrams/AuthFlowDiagram";

export function Section03Auth() {
  return (
    <DocSection
      id="autentizace"
      number="03"
      title="Autentizace a autorizace"
      subtitle="Bcrypt hash hesla, HTTP-only session cookie, role-based access kontrola na úrovni middleware i UI."
    >
      <DocCard>
        <AuthFlowDiagram />
      </DocCard>

      <DocSubsection number="3.1" title="Login flow">
        <ol
          className="space-y-2 text-sm list-decimal list-outside ml-5 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          <li>
            Uživatel vyplní <DocCode>email</DocCode> + <DocCode>password</DocCode>{" "}
            v komponentě <DocCode>LoginPage</DocCode>.
          </li>
          <li>
            Klient pošle <DocCode>POST /api/auth/login</DocCode> s tělem
            <DocCode>{` { email, password } `}</DocCode>.
          </li>
          <li>
            Server načte uživatele z <DocCode>app_users</DocCode> a porovná
            heslo přes <DocCode>bcrypt.compare()</DocCode>.
          </li>
          <li>
            Vygeneruje session token (signed JWT nebo opaque token) a
            uloží do <DocCode>HttpOnly Secure SameSite=Lax</DocCode> cookie
            <DocCode>orm_session</DocCode>.
          </li>
          <li>
            Vrátí <DocCode>200</DocCode> s objektem uživatele (bez hash hesla).
          </li>
          <li>
            Klient redirectne na <DocCode>/</DocCode>, kde Sidebar načte
            povolené moduly přes <DocCode>AuthContext</DocCode>.
          </li>
        </ol>
      </DocSubsection>

      <DocSubsection number="3.2" title="Session cookie">
        <DocCodeBlock language="http">
          {`Set-Cookie: orm_session=<signed-token>;
  Path=/;
  HttpOnly;
  Secure;
  SameSite=Lax;
  Max-Age=2592000   # 30 dní`}
        </DocCodeBlock>
        <DocNotice type="info" title="Proč HttpOnly cookie a ne localStorage?">
          Tokeny v <DocCode>localStorage</DocCode> jsou zranitelné vůči XSS
          útokům. <DocCode>HttpOnly</DocCode> cookie není přístupná z JavaScriptu,
          což drasticky snižuje útočnou plochu a je doporučeno pro
          medicínské aplikace zpracovávající citlivá data.
        </DocNotice>
      </DocSubsection>

      <DocSubsection number="3.3" title="Middleware ochrana rout">
        <DocCard>
          <p
            className="text-sm leading-relaxed mb-3"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Soubor <DocCode>middleware.ts</DocCode> běží v Edge runtime před
            každým requestem. Zachytí všechny rouy kromě veřejných:
          </p>
          <DocCodeBlock language="typescript">
            {`// middleware.ts (zjednodušeno)
export const config = {
  matcher: [
    '/((?!api/auth/login|_next/static|_next/image|favicon.ico|login).*)',
  ],
};

export async function middleware(req: NextRequest) {
  const session = req.cookies.get('orm_session');
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  const user = await verifySession(session.value);
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}`}
          </DocCodeBlock>
        </DocCard>
      </DocSubsection>

      <DocSubsection number="3.4" title="Kontrola role na UI úrovni">
        <DocTable
          headers={["Místo kontroly", "Implementace", "Co kontroluje"]}
          rows={[
            [
              <DocCode key="1">middleware.ts</DocCode>,
              "Edge",
              "Existence platné session cookie.",
            ],
            [
              <DocCode key="2">AuthContext.user.role</DocCode>,
              "Klient",
              "Sidebar filtruje moduly podle role + module_access.",
            ],
            [
              <DocCode key="3">/api/*/route.ts</DocCode>,
              "Server",
              "Každý endpoint volá getCurrentUser() a kontroluje role/permissions.",
            ],
            [
              <DocCode key="4">hasModuleAccess(id)</DocCode>,
              "Hook",
              "Kontroluje, zda uživatel má povolený modul (admin = vše).",
            ],
          ]}
        />
        <DocNotice type="warn" title="Defense in depth">
          UI kontrola sama o sobě nestačí — uživatel by mohl URL routu
          obejít. Proto stejnou kontrolu opakují i Route Handlery
          serverside, takže ani manuální cURL request neprojde.
        </DocNotice>
      </DocSubsection>
    </DocSection>
  );
}
