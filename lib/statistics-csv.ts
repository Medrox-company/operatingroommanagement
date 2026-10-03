import type { StatisticsReport, StatisticsReportMetadata } from './statistics-print';

/**
 * Export statistik do CSV.
 *
 * Tisk a PDF už aplikace uměla, jenže z papíru se dál nepočítá. Kdo chce data
 * protáhnout vlastní tabulkou, musel je dosud přepisovat ručně. CSV vychází
 * ze stejného reportu jako tisk, takže obsahuje přesně to, co je na obrazovce
 * — včetně filtrů zvolených v dané záložce.
 *
 * Formát cílí na český Excel: středník jako oddělovač, desetinná čárka
 * v původních hodnotách zůstává, na začátku BOM, aby se diakritika
 * neotevřela rozsypaná.
 */
const SEPARATOR = ';';
const NEWLINE = '\r\n';

function escapeCell(value: string | number): string {
  const text = String(value ?? '').replace(/ /g, ' ').trim();
  // Uvozovky jsou nutné jen u buněk s oddělovačem, uvozovkou nebo koncem řádku.
  if (/["\n\r;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function row(cells: Array<string | number>): string {
  return cells.map(escapeCell).join(SEPARATOR);
}

export function buildStatisticsCsv(report: StatisticsReport, metadata: StatisticsReportMetadata): string {
  const lines: string[] = [];

  lines.push(row(['Report', metadata.tabLabel]));
  lines.push(row(['Období', metadata.periodLabel]));
  if (metadata.hospitalName) lines.push(row(['Zařízení', metadata.hospitalName]));
  if (report.context) lines.push(row(['Kontext', report.context]));
  lines.push(row(['Vytvořeno', metadata.generatedAt.toLocaleString('cs-CZ')]));

  if (report.metrics.length > 0) {
    lines.push('');
    lines.push(row(['Souhrnné ukazatele']));
    lines.push(row(['Ukazatel', 'Hodnota', 'Poznámka']));
    for (const metric of report.metrics) {
      lines.push(row([metric.label, metric.value, metric.detail ?? '']));
    }
  }

  for (const section of report.sections) {
    lines.push('');
    lines.push(row([section.title]));
    if (section.description) lines.push(row([section.description]));
    lines.push(row(section.columns.map(column => column.label)));
    if (section.rows.length === 0) {
      lines.push(row([section.emptyMessage ?? 'Bez záznamů']));
      continue;
    }
    for (const dataRow of section.rows) lines.push(row(dataRow));
  }

  return lines.join(NEWLINE);
}

/** Stáhne report jako soubor .csv. Nic neodesílá na server. */
export function downloadStatisticsCsv(report: StatisticsReport, metadata: StatisticsReportMetadata): void {
  const csv = buildStatisticsCsv(report, metadata);
  // BOM — bez něj Excel na Windows zobrazí diakritiku rozsypanou.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${metadata.filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Uvolnění až po kliknutí, jinak Safari stahování zruší.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
