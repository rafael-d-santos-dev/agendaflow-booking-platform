/**
 * AgendaFlow — Common Card Component
 * Restrained borders, editorial luxury surfaces, and balanced padding
 */

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'ivory' | 'sand' | 'outline' | 'espresso';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  isInteractive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  variant = 'ivory',
  padding = 'md',
  isInteractive = false,
  children,
  className = '',
  ...props
}) => {
  const variantStyles = {
    ivory: 'bg-[#F4EBDD] border border-[#D8C3A5]/60 text-[#30251E] shadow-[0_2px_8px_rgba(48,37,30,0.04)]',
    sand: 'bg-[#EFE5D5] border border-[#D8C3A5] text-[#30251E] shadow-[0_2px_8px_rgba(48,37,30,0.04)]',
    outline: 'bg-transparent border border-[#80664F]/30 text-[#30251E]',
    espresso: 'bg-[#30251E] border border-[#4A3B31] text-[#F4EBDD] shadow-[0_4px_16px_rgba(0,0,0,0.12)]',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const interactiveStyles = isInteractive
    ? 'transition-all duration-200 cursor-pointer hover:border-[#B58A55] hover:shadow-[0_4px_16px_rgba(48,37,30,0.08)]'
    : '';

  return (
    <div
      className={`rounded-sm ${variantStyles[variant]} ${paddingStyles[padding]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
