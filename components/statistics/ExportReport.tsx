'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown, Download, Mail, Share2, CheckCircle2, AlertCircle } from 'lucide-react';
import { C, Card } from './shared';

interface ExportOption {
  id: string;
  label: string;
  format: 'pdf' | 'csv' | 'excel' | 'email';
  icon: React.ReactNode;
  description: string;
}

interface ExportReportProps {
  periodLabel: string;
  totalOps: number;
  avgUtilization: number;
  onExport?: (format: string) => Promise<void>;
  className?: string;
}

export const ExportReport: React.FC<ExportReportProps> = ({
  periodLabel,
  totalOps,
  avgUtilization,
  onExport,
  className = '',
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const exportOptions: ExportOption[] = [
    {
      id: 'pdf',
      label: 'PDF Report',
      format: 'pdf',
      icon: <FileDown size={16} />,
      description: 'Detailní PDF zpráva s grafy a analýzou',
    },
    {
      id: 'csv',
      label: 'CSV Export',
      format: 'csv',
      icon: <Download size={16} />,
      description: 'Surová data v CSV formátu pro Excel',
    },
    {
      id: 'email',
      label: 'Poslat e-mailem',
      format: 'email',
      icon: <Mail size={16} />,
      description: 'Odeslat zprávu na váš e-mail',
    },
    {
      id: 'share',
      label: 'Sdílet',
      format: 'excel',
      icon: <Share2 size={16} />,
      description: 'Vytvořit sdílný odkaz',
    },
  ];

  const handleExport = async (format: string) => {
    setSelectedFormat(format);
    setIsExporting(true);
    setExportStatus('idle');

    try {
      if (onExport) {
        await onExport(format);
      }
      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      console.error('[v0] Export error:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileDown size={16} color={C.accent} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.textHi }}>
          Export & Reporty
        </h3>
      </div>

      <p className="text-[10px] mb-3" style={{ color: C.muted }}>
        Perioda: <span className="font-semibold" style={{ color: C.text }}>{periodLabel}</span> · 
        Výkony: <span className="font-semibold" style={{ color: C.accent }}>{totalOps}</span> · 
        Utilization: <span className="font-semibold" style={{ color: C.accent }}>{avgUtilization}%</span>
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {exportOptions.map((option) => (
          <motion.button
            key={option.id}
            onClick={() => handleExport(option.format)}
            disabled={isExporting}
            whileHover={{ scale: isExporting ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-2.5 rounded-xl border transition-all disabled:opacity-50"
            style={{
              background: selectedFormat === option.id ? `${C.accent}20` : C.surface2,
              borderColor: selectedFormat === option.id ? `${C.accent}40` : C.border,
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <div style={{ color: selectedFormat === option.id ? C.accent : C.muted }}>
                {option.icon}
              </div>
              <span className="text-[9px] font-bold" style={{ color: C.textHi }}>
                {option.label}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {exportStatus === 'success' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="p-2.5 rounded-lg flex items-center gap-2 mb-3"
          style={{
            background: `${C.green}15`,
            border: `1px solid ${C.green}40`,
          }}
        >
          <CheckCircle2 size={14} color={C.green} />
          <span className="text-[10px]" style={{ color: C.green }}>
            Export úspěšně dokončen
          </span>
        </motion.div>
      )}

      {exportStatus === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="p-2.5 rounded-lg flex items-center gap-2 mb-3"
          style={{
            background: `${C.red}15`,
            border: `1px solid ${C.red}40`,
          }}
        >
          <AlertCircle size={14} color={C.red} />
          <span className="text-[10px]" style={{ color: C.red }}>
            Chyba při exportu - zkuste znovu
          </span>
        </motion.div>
      )}

      {isExporting && (
        <div className="p-2 text-center text-[10px]" style={{ color: C.muted }}>
          <div className="inline-block w-4 h-4 border-2 border-transparent rounded-full animate-spin"
            style={{ borderTopColor: C.accent }} />
          <span className="ml-2">Generuji zprávu...</span>
        </div>
      )}

      <p className="text-[9px]" style={{ color: C.faint }}>
        Všechny exporty obsahují data z období <strong>{periodLabel}</strong> s reálnými čísly z databáze.
      </p>
    </Card>
  );
};

export default ExportReport;
