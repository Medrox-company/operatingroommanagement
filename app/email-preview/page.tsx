'use client';

import React, { useState } from 'react';
import {
  EmailTemplate,
  LateArrivalEmailTemplate,
  ScheduleChangeEmailTemplate,
  WelcomeEmailTemplate,
} from '../../components/EmailTemplate';

type TemplateType = 'custom' | 'late-arrival' | 'schedule-change' | 'welcome';

export default function EmailPreviewPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('late-arrival');

  const templates: { id: TemplateType; name: string }[] = [
    { id: 'late-arrival', name: 'Pozdní příchod' },
    { id: 'schedule-change', name: 'Změna rozvrhu' },
    { id: 'welcome', name: 'Uvítací email' },
    { id: 'custom', name: 'Vlastní šablona' },
  ];

  const renderTemplate = () => {
    switch (selectedTemplate) {
      case 'late-arrival':
        return (
          <LateArrivalEmailTemplate
            operatorName="MUDr. Jan Novák"
            roomName="Sál 3"
            scheduledTime="08:00"
            ctaUrl="#"
          />
        );
      case 'schedule-change':
        return (
          <ScheduleChangeEmailTemplate
            recipientName="MUDr. Petra Svobodová"
            changeDescription="Vaše operace naplánovaná na 14:00 v sálu 2 byla přesunuta na 15:30. Důvodem změny je prodloužení předchozí operace. Prosíme o potvrzení přijetí této změny."
            ctaUrl="#"
          />
        );
      case 'welcome':
        return (
          <WelcomeEmailTemplate
            recipientName="MUDr. Martin Dvořák"
            loginUrl="#"
          />
        );
      case 'custom':
        return (
          <EmailTemplate
            heading="Vlastní oznámení"
            recipientName="uživateli"
            message="Toto je ukázka vlastní emailové šablony, kterou můžete přizpůsobit dle potřeby. Stačí změnit props komponenty EmailTemplate."
            ctaText="Akce"
            ctaUrl="#"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="bg-[#141419] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-10 h-10"
              />
              <div>
                <h1 className="text-white font-semibold">Email Template Preview</h1>
                <p className="text-white/40 text-sm">Náhled emailových šablon</p>
              </div>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 text-sm transition-colors"
            >
              Zpět do aplikace
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Template Selector */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-[#141419] border border-white/10 rounded-2xl p-4">
              <h2 className="text-white/50 text-xs font-medium uppercase tracking-widest mb-4">
                Šablony
              </h2>
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                      selectedTemplate === template.id
                        ? 'bg-[#00D8C1]/20 text-[#00D8C1] border border-[#00D8C1]/30'
                        : 'text-white/60 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-4 bg-[#141419] border border-white/10 rounded-2xl p-4">
              <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest mb-3">
                Informace
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Tyto šablony jsou určeny pro emailové notifikace systému Operating Room Manager.
                Jsou optimalizovány pro kompatibilitu s většinou emailových klientů.
              </p>
            </div>
          </div>

          {/* Email Preview */}
          <div className="flex-1">
            <div className="bg-[#141419] border border-white/10 rounded-2xl overflow-hidden">
              {/* Preview Header */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-white/40 text-sm">Náhled emailu</span>
                </div>
                <span className="text-white/30 text-xs">600px šířka</span>
              </div>

              {/* Email Content */}
              <div className="p-8 bg-[#1a1a22] flex justify-center">
                <div className="w-full max-w-[640px] bg-[#0a0a0f] rounded-lg overflow-hidden shadow-2xl">
                  {renderTemplate()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
