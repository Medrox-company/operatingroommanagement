"use client";

import { useState } from "react";
import { Download, Printer, Activity, Menu, X } from "lucide-react";
import { Section01Overview } from "./sections/Section01Overview";
import { Section02Architecture } from "./sections/Section02Architecture";
import { Section03Auth } from "./sections/Section03Auth";
import { Section04Modules } from "./sections/Section04Modules";
import { Section05Workflow } from "./sections/Section05Workflow";
import { Section06ApiReference } from "./sections/Section06ApiReference";
import { Section07Database } from "./sections/Section07Database";
import { Section08Dependencies } from "./sections/Section08Dependencies";
import { Section09UserGuide } from "./sections/Section09UserGuide";
import { Section10Troubleshooting } from "./sections/Section10Troubleshooting";
import { DocColors, DocBadge } from "./DocPrimitives";

const TOC = [
  { id: "prehled", num: "01", title: "Přehled aplikace" },
  { id: "architektura", num: "02", title: "Architektura" },
  { id: "autentizace", num: "03", title: "Autentizace" },
  { id: "moduly", num: "04", title: "Moduly aplikace" },
  { id: "workflow", num: "05", title: "Workflow & stavy" },
  { id: "api-reference", num: "06", title: "API Reference" },
  { id: "databaze", num: "07", title: "Databáze" },
  { id: "zavislosti", num: "08", title: "Závislosti & ENV" },
  { id: "navod", num: "09", title: "Návod k používání" },
  { id: "troubleshooting", num: "10", title: "Troubleshooting" },
];

export function DocsPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (typeof window === "undefined") return;
    setDownloading(true);
    try {
      const html2canvasMod = await import("html2canvas");
      const jsPDFMod = await import("jspdf");
      const html2canvas = html2canvasMod.default;
      const JsPDF = jsPDFMod.default;

      const target = document.getElementById("docs-printable");
      if (!target) return;

      const canvas = await html2canvas(target, {
        backgroundColor: "#020617",
        scale: 2,
        useCORS: true,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new JsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }

      pdf.save("operating-room-manager-docs.pdf");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="min-h-screen text-white" style={{ background: "#020617" }}>
      <style jsx global>{`
        @media print {
          .docs-no-print {
            display: none !important;
          }
          #docs-printable {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          body {
            background: #020617 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          section {
            page-break-before: always;
            break-before: page;
          }
          section:first-of-type {
            page-break-before: auto;
            break-before: auto;
          }
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      <header
        className="docs-no-print sticky top-0 z-30 backdrop-blur-md"
        style={{
          background: "rgba(2,6,23,0.85)",
          borderBottom: `1px solid ${DocColors.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setNavOpen(!navOpen)}
            className="md:hidden p-2 rounded-md"
            style={{ border: `1px solid ${DocColors.border}` }}
            aria-label="Toggle obsah"
          >
            {navOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Activity size={20} style={{ color: DocColors.accent }} />
            <div className="min-w-0">
              <div
                className="text-[10px] font-mono tracking-[0.25em] uppercase truncate"
                style={{ color: DocColors.muted }}
              >
                Documentation
              </div>
              <div className="font-bold tracking-tight truncate">
                OperatingRoom Manager
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition"
            style={{
              border: `1px solid ${DocColors.borderStrong}`,
              color: DocColors.text,
            }}
          >
            <Printer size={14} /> Tisk
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
            style={{ background: DocColors.accent, color: "#020617" }}
          >
            <Download size={14} />
            {downloading ? "Generuji..." : "Stáhnout PDF"}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 grid md:grid-cols-[240px_1fr] gap-8">
        <aside
          className={`docs-no-print md:sticky md:top-24 md:self-start ${
            navOpen ? "block" : "hidden md:block"
          }`}
        >
          <div
            className="rounded-xl p-4"
            style={{
              background: DocColors.glass,
              border: `1px solid ${DocColors.border}`,
            }}
          >
            <div
              className="text-[10px] font-mono uppercase tracking-[0.25em] mb-3"
              style={{ color: DocColors.accent }}
            >
              Obsah
            </div>
            <nav className="space-y-1">
              {TOC.map((it) => (
                <a
                  key={it.id}
                  href={`#${it.id}`}
                  onClick={() => setNavOpen(false)}
                  className="flex items-baseline gap-2 px-2 py-1.5 rounded-md text-sm transition hover:bg-white/5"
                  style={{ color: DocColors.text }}
                >
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: DocColors.muted }}
                  >
                    {it.num}
                  </span>
                  <span>{it.title}</span>
                </a>
              ))}
            </nav>
          </div>
          <p
            className="mt-4 text-[11px] leading-relaxed font-mono"
            style={{ color: DocColors.muted }}
          >
            v1.0 • {new Date().toLocaleDateString("cs-CZ")}
          </p>
        </aside>

        <main id="docs-printable" className="space-y-16 md:space-y-20 min-w-0">
          <CoverPage />
          <Section01Overview />
          <Section02Architecture />
          <Section03Auth />
          <Section04Modules />
          <Section05Workflow />
          <Section06ApiReference />
          <Section07Database />
          <Section08Dependencies />
          <Section09UserGuide />
          <Section10Troubleshooting />
          <FooterCard />
        </main>
      </div>
    </div>
  );
}

function CoverPage() {
  return (
    <section
      className="rounded-3xl overflow-hidden relative"
      style={{
        background:
          "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(2,6,23,1) 60%)",
        border: `1px solid ${DocColors.borderStrong}`,
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(251,191,36,0.18) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative px-8 md:px-16 py-16 md:py-24">
        <div className="flex items-center gap-3 mb-6">
          <Activity size={28} style={{ color: DocColors.accent }} />
          <span
            className="text-[10px] font-mono uppercase tracking-[0.4em]"
            style={{ color: DocColors.accent }}
          >
            Operating Room Manager
          </span>
        </div>
        <h1
          className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4"
          style={{ color: "white" }}
        >
          Kompletní
          <br />
          <span style={{ color: DocColors.accent }}>dokumentace</span>
        </h1>
        <p
          className="max-w-2xl text-base md:text-lg leading-relaxed mb-8"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          Podrobný průvodce architekturou, funkcemi, závislostmi a používáním
          aplikace. Obsahuje diagramy závislostí, ER schéma databáze, API
          referenci a návod krok za krokem pro každou roli.
        </p>
        <div className="flex flex-wrap gap-2">
          <DocBadge tone="accent">v1.0</DocBadge>
          <DocBadge tone="info">Next.js 15</DocBadge>
          <DocBadge tone="purple">Supabase</DocBadge>
          <DocBadge tone="ok">10 sekcí</DocBadge>
          <DocBadge>5 diagramů</DocBadge>
        </div>

        <div
          className="mt-12 pt-8 grid grid-cols-2 md:grid-cols-4 gap-6"
          style={{ borderTop: `1px solid ${DocColors.border}` }}
        >
          {[
            { l: "Verze", v: "1.0.0" },
            { l: "Datum", v: new Date().toLocaleDateString("cs-CZ") },
            { l: "Sekcí", v: "10" },
            { l: "Diagramů", v: "5" },
          ].map((m) => (
            <div key={m.l}>
              <div
                className="text-[9px] font-mono uppercase tracking-[0.25em] mb-1"
                style={{ color: DocColors.muted }}
              >
                {m.l}
              </div>
              <div
                className="text-xl font-bold"
                style={{ color: DocColors.accent }}
              >
                {m.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterCard() {
  return (
    <footer
      className="rounded-2xl p-6 md:p-8 text-center"
      style={{
        background: DocColors.glass,
        border: `1px solid ${DocColors.border}`,
      }}
    >
      <div className="flex items-center justify-center gap-2 mb-3">
        <Activity size={18} style={{ color: DocColors.accent }} />
        <span
          className="text-[10px] font-mono uppercase tracking-[0.3em]"
          style={{ color: DocColors.accent }}
        >
          End of document
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: DocColors.text }}>
        Dokumentace OperatingRoom Manager — vygenerováno v aplikaci.
      </p>
      <p className="mt-2 text-xs font-mono" style={{ color: DocColors.muted }}>
        © {new Date().getFullYear()} • Generated{" "}
        {new Date().toLocaleString("cs-CZ")}
      </p>
    </footer>
  );
}
