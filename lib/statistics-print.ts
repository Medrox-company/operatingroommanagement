export interface StatisticsReportMetric {
  label: string;
  value: string | number;
  detail?: string;
}

export interface StatisticsReportSection {
  title: string;
  description?: string;
  columns: Array<{ label: string; align?: 'left' | 'right'; width?: string }>;
  rows: Array<Array<string | number>>;
  emptyMessage?: string;
}

export interface StatisticsReport {
  context?: string;
  /** Earliest operational-day boundary needed from the shared calendar history. */
  requiredHistoryFrom?: string;
  metrics: StatisticsReportMetric[];
  sections: StatisticsReportSection[];
}

export interface StatisticsReportMetadata {
  tabLabel: string;
  periodLabel: string;
  hospitalName?: string;
  generatedAt: Date;
  filename: string;
}

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

/** Standalone paper-first document. No app styles, hidden overflow, dark tokens,
 * interactive chart dependency, remote resources or interpolated markup. */
export function buildStatisticsPrintHtml(report: StatisticsReport, metadata: StatisticsReportMetadata): string {
  const text = escapeHtml;
  const generated = metadata.generatedAt.toLocaleString('cs-CZ', { dateStyle: 'long', timeStyle: 'short' });
  const sections = report.sections.map((section, index) => `
    <section class="report-section">
      <h2><span class="section-number">${String(index + 1).padStart(2, '0')}</span>${text(section.title)}</h2>
      ${section.description ? `<p class="section-note">${text(section.description)}</p>` : ''}
      <table>
        <thead><tr>${section.columns.map(column => `<th scope="col"${column.align === 'right' ? ' class="numeric"' : ''}>${text(column.label)}</th>`).join('')}</tr></thead>
        <tbody>${section.rows.length ? section.rows.map(row => `<tr>${section.columns.map((column, columnIndex) => `<td${column.align === 'right' ? ' class="numeric"' : ''}>${text(row[columnIndex] ?? '')}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${Math.max(1, section.columns.length)}" class="empty">${text(section.emptyMessage ?? 'Pro vybraný filtr nejsou k dispozici žádné záznamy.')}</td></tr>`}</tbody>
      </table>
    </section>`).join('');

  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${text(metadata.filename)}</title>
<style>
  * { box-sizing: border-box; }
  html { color-scheme: light; background: #e8edf3; }
  body { margin: 0; color: #17233f; font: 10pt/1.45 Arial, Helvetica, sans-serif; font-variant-numeric: tabular-nums; }
  .report-toolbar { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 14px 24px; background: #111b38; color: #fff; font-size: 12px; }
  .report-toolbar p { margin: 0; }
  .report-toolbar small { display: block; margin-top: 3px; color: #cbd5e1; }
  .report-actions { display: flex; gap: 8px; }
  button { font: inherit; padding: 10px 16px; border: 1px solid #7b8aa5; border-radius: 6px; cursor: pointer; background: #fff; color: #17233f; }
  button.primary { background: #67e8f9; border-color: #67e8f9; }
  button:focus-visible { outline: 3px solid #06b6d4; outline-offset: 3px; }
  article { max-width: 210mm; margin: 20px auto; padding: 16mm 14mm; background: #fff; box-shadow: 0 3px 18px #17233f16; }
  .report-header { border-bottom: 2px solid #0e7490; padding-bottom: 5mm; margin-bottom: 6mm; break-inside: avoid; }
  .eyebrow { margin: 0 0 2mm; color: #0e7490; font-size: 8pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
  h1 { margin: 0; font-size: 26pt; font-weight: 700; line-height: 1.1; letter-spacing: -.03em; }
  .metadata { display: flex; flex-wrap: wrap; gap: 2mm 7mm; margin-top: 4mm; color: #475569; font-size: 8.5pt; }
  .metadata b { color: #17233f; }
  .context { margin: 4mm 0 0; padding: 3mm 4mm; border-left: 2px solid #0e7490; background: #f1f6fa; font-size: 9pt; white-space: pre-line; }
  .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid #d8e0eb; margin-bottom: 7mm; border-radius: 6px; overflow: hidden; break-inside: avoid; }
  .metric { min-width: 0; padding: 3mm; border-right: 1px solid #d8e0eb; }
  .metric:last-child { border-right: 0; }
  .metric-label { display: block; color: #475569; font-size: 7.5pt; font-weight: 700; line-height: 1.3; }
  .metric-value { display: block; margin-top: 2mm; font-size: 16pt; font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; }
  .metric-detail { display: block; margin-top: 1mm; font-size: 7.5pt; color: #475569; }
  .report-section { margin: 0 0 7mm; }
  h2 { margin: 0 0 3mm; font-size: 12pt; line-height: 1.3; break-after: avoid; }
  .section-number { display: inline-block; margin-right: 3mm; color: #0e7490; font-size: 9pt; }
  .section-note { margin: -1mm 0 3mm; color: #475569; font-size: 8pt; line-height: 1.4; break-after: avoid; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 8.5pt; line-height: 1.4; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th { padding: 2.5mm 2mm; border-top: 1px solid #9cabbf; border-bottom: 1px solid #9cabbf; background: #edf2f7; text-align: left; vertical-align: bottom; font-size: 8pt; font-weight: 700; }
  td { padding: 2.3mm 2mm; border-bottom: 1px solid #dbe2ec; vertical-align: top; overflow-wrap: anywhere; white-space: pre-line; }
  tbody tr:nth-child(even) { background: #f7f9fc; }
  .numeric { text-align: right; }
  .empty { color: #475569; padding: 5mm 2mm; }
  .report-footer { margin-top: 6mm; padding-top: 3mm; border-top: 1px solid #d8e0eb; font-size: 7.5pt; color: #475569; }
  @media (max-width: 700px) { article { margin: 0; padding: 24px 16px; } .metrics { grid-template-columns: repeat(2,minmax(0,1fr)); } table { font-size: 8pt; } }
  @page { size: A4 portrait; margin: 14mm 12mm 16mm; @bottom-left { content: "Statistiky operačních sálů"; font: 8pt Arial; color: #64748b; } @bottom-right { content: counter(page) " / " counter(pages); font: 8pt Arial; color: #64748b; } }
  @media print {
    html, body { margin: 0; padding: 0; height: auto; overflow: visible; background: #fff; color: #17233f; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-shadow: none !important; }
    .report-toolbar { display: none !important; }
    article { max-width: none; width: auto; margin: 0; padding: 0; box-shadow: none; }
    .metrics { grid-template-columns: repeat(4,minmax(0,1fr)); }
    h1, h2, .report-header { break-after: avoid; }
    p { orphans: 3; widows: 3; }
  }
</style></head><body>
<div class="report-toolbar"><p><strong>Náhled reportu - ${text(metadata.tabLabel)}</strong><small id="report-help" role="status">PDF: v tiskovém dialogu vyberte „Uložit jako PDF“.</small></p><div class="report-actions"><button id="report-close" type="button">Zavřít</button><button id="report-print" class="primary" type="button">Tisk / Uložit PDF</button></div></div>
<article aria-label="Statistický report">
  <header class="report-header"><p class="eyebrow">Operační sály · Statistický report</p><h1>${text(metadata.tabLabel)}</h1>
    <div class="metadata">${metadata.hospitalName ? `<span><b>Zařízení:</b> ${text(metadata.hospitalName)}</span>` : ''}<span><b>Období:</b> ${text(metadata.periodLabel)}</span><span><b>Vytvořeno:</b> ${text(generated)}</span></div>
    ${report.context ? `<p class="context">${text(report.context)}</p>` : ''}
  </header>
  ${report.metrics.length ? `<div class="metrics">${report.metrics.map(metric => `<div class="metric"><span class="metric-label">${text(metric.label)}</span><strong class="metric-value">${text(metric.value)}</strong>${metric.detail ? `<span class="metric-detail">${text(metric.detail)}</span>` : ''}</div>`).join('')}</div>` : ''}
  ${sections}
  <footer class="report-footer">${text(metadata.tabLabel)} · ${text(metadata.periodLabel)}<br>Report zachycuje data a filtry vybrané záložky v okamžiku vytvoření. Prázdná hodnota není nahrazena odhadem.</footer>
</article></body></html>`;
}

/** The report owns its window and survives closing/cancelling the print dialog.
 * Never toggle application tabs, change the app title, or start new data loads. */
export function openStatisticsPrintReport(report: StatisticsReport, metadata: StatisticsReportMetadata): void {
  const html = buildStatisticsPrintHtml(report, metadata);
  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Prohlížeč zablokoval náhled. Povolte otevírání oken pro tuto aplikaci a zkuste tisk znovu.');
  preview.opener = null;
  preview.document.open();
  preview.document.write(html);
  preview.document.close();
  const print = () => {
    if (preview.closed) return;
    try {
      preview.print();
    } catch {
      const help = preview.document.getElementById('report-help');
      if (help) help.textContent = 'Automatický tisk není v tomto prohlížeči dostupný. Použijte tlačítko Tisk / Uložit PDF nebo tisk z nabídky prohlížeče.';
    }
  };
  preview.document.getElementById('report-print')?.addEventListener('click', print);
  preview.document.getElementById('report-close')?.addEventListener('click', () => preview.close());
  // Pure HTML tables need no chart animation or arbitrary timer. The paper
  // document stays available if a browser disallows automatic print dialogs.
  void preview.document.fonts.ready.then(() => {
    if (!preview.closed) preview.requestAnimationFrame(() => {
      if (!preview.closed) preview.requestAnimationFrame(() => {
        print();
      });
    });
  }).catch(print);
}
