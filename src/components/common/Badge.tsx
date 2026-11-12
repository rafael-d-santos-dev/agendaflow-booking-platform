/**
 * AgendaFlow — Common Badge Component
 * Contrast-safe status badges with readable typography
 */

import React from 'react';

export type BadgeVariant = 'gold' | 'sand' | 'taupe' | 'espresso' | 'terracotta' | 'moss';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'sand',
  size = 'md',
  children,
  icon,
  className = '',
}) => {
  // Size styles: restrict 11px uppercase to secondary metadata, md uses 12-13px
  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'text-[11px] px-2 py-0.5 uppercase tracking-wider font-semibold',
    md: 'text-xs px-2.5 py-1 font-medium tracking-normal',
  };

  // Contrast safe variants with Espresso #30251E or dark shades for guaranteed AA readability
  const variantStyles: Record<BadgeVariant, string> = {
    gold: 'bg-[#B58A55]/15 text-[#30251E] border border-[#B58A55]/50',
    sand: 'bg-[#D8C3A5]/40 text-[#30251E] border border-[#D8C3A5]',
    taupe: 'bg-[#80664F]/15 text-[#4A3B31] border border-[#80664F]/35',
    espresso: 'bg-[#30251E] text-[#F4EBDD]',
    terracotta: 'bg-[#8C4336]/15 text-[#8C4336] border border-[#8C4336]/30',
    moss: 'bg-[#465945]/15 text-[#30251E] border border-[#465945]/35',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
