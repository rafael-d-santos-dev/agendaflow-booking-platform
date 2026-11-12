/**
 * AgendaFlow — Customer Booking Portal Layout Shell
 * Purely public-facing editorial luxury experience.
 * Zero administrative controls or management navigation.
 */

import React from 'react';
import { MapPin, Phone, Mail, ShieldCheck, Clock } from 'lucide-react';
import { Business } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';

interface CustomerLayoutProps {
  business: Business;
  currentStep?: string;
  onNavigateHome?: () => void;
  children: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({
  business,
  currentStep = 'service',
  onNavigateHome,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#F4EBDD] text-[#30251E] flex flex-col antialiased selection:bg-[#D8C3A5]">
      {/* Editorial Boutique Header */}
      <header className="border-b border-[#D8C3A5] bg-[#FAF6F0] sticky top-0 z-30 shadow-[0_1px_3px_rgba(48,37,30,0.03)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2.5">
              <button
                onClick={onNavigateHome}
                className="font-editorial text-2xl font-bold tracking-tight text-[#30251E] hover:text-[#594231] transition-colors text-left"
              >
                {business.name}
              </button>
              <Badge variant="gold" size="sm">
                {business.config.badge}
              </Badge>
            </div>
            <p className="text-xs text-[#594231] font-sans mt-0.5 line-clamp-1 max-w-md">
              {business.tagline}
            </p>
          </div>

          {/* Quick contact credentials */}
          <div className="flex items-center gap-4 text-xs text-[#4A3B31]">
            <span className="hidden md:inline-flex items-center gap-1.5">
              <MapPin size={13} className="text-[#80664F]" />
              <span className="truncate max-w-[200px]">{business.address.split(',')[0]}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-[#30251E]">
              <Phone size={13} className="text-[#80664F]" />
              {business.phone}
            </span>
          </div>
        </div>

        {/* Subtle step indicators for the booking flow */}
        <div className="bg-[#EFE5D5] border-t border-[#D8C3A5]/50 py-2">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-[#594231]">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wider text-[11px] font-semibold text-[#80664F]">
                Booking Concierge
              </span>
              <span>/</span>
              <span className="capitalize font-medium text-[#30251E]">
                {business.config.terminology.bookingAction}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#465945] font-medium">
              <ShieldCheck size={14} />
              <span>Direct Reservation Guarantee</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {children}
      </main>

      {/* Editorial Boutique Footer */}
      <footer className="border-t border-[#D8C3A5] bg-[#EFE5D5] py-8 text-xs text-[#594231] mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="font-editorial text-sm font-semibold text-[#30251E] mb-1">
              {business.name}
            </p>
            <p className="text-xs text-[#80664F]">
              {business.address}
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#594231]">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} className="text-[#80664F]" />
              <span>Mon–Fri: {business.hours.monday.open} – {business.hours.monday.close}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail size={13} className="text-[#80664F]" />
              <span>{business.email}</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
