import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ModulePageHeadingProps {
  icon: LucideIcon;
  kicker: string;
  title: string;
  mutedTitle?: string;
  className?: string;
  titleClassName?: string;
}

/** Jediný zdroj typografie pro desktopové hlavičky modulů. */
const ModulePageHeading: React.FC<ModulePageHeadingProps> = ({
  icon: Icon,
  kicker,
  title,
  mutedTitle,
  className = '',
  titleClassName = '',
}) => (
  <div className={`module-page-heading ${className}`}>
    <div className="app-module-kicker-row">
      <Icon className="h-4 w-4 shrink-0 text-[#A8B3C8]" strokeWidth={1.5} aria-hidden />
      <p className="app-module-kicker">{kicker}</p>
    </div>
    <h1 className={`app-module-title ${titleClassName}`}>
      {title}{mutedTitle ? <> <span className="app-module-title-muted">{mutedTitle}</span></> : null}
    </h1>
  </div>
);

export default ModulePageHeading;
