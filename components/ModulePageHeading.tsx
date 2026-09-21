import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ModulePageHeadingProps {
  icon: LucideIcon;
  kicker: string;
  title: string;
  mutedTitle?: string;
  className?: string;
  titleClassName?: string;
  /** Volitelné ovládání zarovnané doprava v řádku nadpisu. */
  actions?: React.ReactNode;
  /** Prvek hned za textem nadpisu — např. otazník nápovědy. */
  titleAfter?: React.ReactNode;
}

/** Jediný zdroj typografie pro desktopové hlavičky modulů. */
const ModulePageHeading: React.FC<ModulePageHeadingProps> = ({
  icon: Icon,
  kicker,
  title,
  mutedTitle,
  className = '',
  titleClassName = '',
  actions,
  titleAfter,
}) => (
  <div className={`module-page-heading ${className}`}>
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="app-module-kicker-row">
          <Icon className="h-4 w-4 shrink-0 text-[#A8B3C8]" strokeWidth={1.5} aria-hidden />
          <p className="app-module-kicker">{kicker}</p>
        </div>
        {titleAfter ? (
          <div className="flex items-center gap-3">
            <h1 className={`app-module-title ${titleClassName}`}>
              {title}{mutedTitle ? <> <span className="app-module-title-muted">{mutedTitle}</span></> : null}
            </h1>
            {titleAfter}
          </div>
        ) : (
          <h1 className={`app-module-title ${titleClassName}`}>
            {title}{mutedTitle ? <> <span className="app-module-title-muted">{mutedTitle}</span></> : null}
          </h1>
        )}
      </div>
      {actions ? <div className="shrink-0 pb-1">{actions}</div> : null}
    </div>
  </div>
);

export default ModulePageHeading;
