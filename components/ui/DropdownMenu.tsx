'use client';

import * as React from 'react';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Přístupné kontextové / akční menu (Radix). Klávesnice, focus trap a
 * pozicování jsou řešené automaticky.
 *
 * @example
 *   <DropdownMenu trigger={<button className={tw.btnIcon}><MoreVertical /></button>}>
 *     <DropdownItem onSelect={onEdit}>Upravit</DropdownItem>
 *     <DropdownSeparator />
 *     <DropdownItem danger onSelect={onDelete}>Smazat</DropdownItem>
 *   </DropdownMenu>
 */
interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  align = 'end',
  side = 'bottom',
  className,
}) => (
  <RadixDropdown.Root>
    <RadixDropdown.Trigger asChild>{trigger}</RadixDropdown.Trigger>
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        align={align}
        side={side}
        sideOffset={6}
        className={cn(
          'z-[100] min-w-[180px] rounded-xl p-1.5',
          'bg-[#0b1220]/95 border border-white/12 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.55)]',
          className,
        )}
      >
        {children}
      </RadixDropdown.Content>
    </RadixDropdown.Portal>
  </RadixDropdown.Root>
);

interface DropdownItemProps {
  children: React.ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  onSelect,
  danger,
  disabled,
  icon,
}) => (
  <RadixDropdown.Item
    disabled={disabled}
    onSelect={onSelect}
    className={cn(
      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer select-none outline-none',
      'transition-colors data-[highlighted]:bg-white/[0.08]',
      'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed',
      danger ? 'text-red-400 data-[highlighted]:bg-red-500/15' : 'text-white/85',
    )}
  >
    {icon && <span className="shrink-0 opacity-80">{icon}</span>}
    {children}
  </RadixDropdown.Item>
);

export const DropdownSeparator: React.FC = () => (
  <RadixDropdown.Separator className="my-1 h-px bg-white/10" />
);

export const DropdownLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RadixDropdown.Label className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
    {children}
  </RadixDropdown.Label>
);
