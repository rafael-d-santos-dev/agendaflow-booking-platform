/**
 * AgendaFlow — Admin Layout Shell
 * Operational management interface with high information density,
 * industry switcher, and distinct Espresso sidebar.
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Clock, 
  Tag, 
  Users, 
  UserCheck, 
  Settings, 
  ExternalLink, 
  Menu, 
  X, 
  ChevronDown,
  Building2,
  Sparkles
} from 'lucide-react';
import { Business } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';

interface AdminLayoutProps {
  currentPath: string;
  businesses: Business[];
  activeBusiness: Business;
  onSelectBusiness: (businessId: string) => void;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentPath,
  businesses,
  activeBusiness,
  onSelectBusiness,
  onNavigate,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false);

  const navItems = [
    { label: 'Overview', path: '/admin/overview', icon: <LayoutDashboard size={18} /> },
    { label: 'Live Calendar', path: '/admin/calendar', icon: <CalendarIcon size={18} /> },
    { label: 'Appointments', path: '/admin/appointments', icon: <Clock size={18} /> },
    { label: activeBusiness.config.terminology.services, path: '/admin/services', icon: <Tag size={18} /> },
    { label: activeBusiness.config.terminology.specialists, path: '/admin/team', icon: <UserCheck size={18} /> },
    { label: 'Customers', path: '/admin/customers', icon: <Users size={18} /> },
    { label: 'Business Settings', path: '/admin/settings', icon: <Settings size={18} /> },
  ];

  const handleNavClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  const handlePreviewCustomerPortal = () => {
    onNavigate(`/book?business=${activeBusiness.slug}`);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F4EBDD] text-[#30251E] flex flex-col lg:flex-row antialiased">
      {/* Mobile Topbar */}
      <header className="lg:hidden bg-[#30251E] text-[#F4EBDD] px-4 py-3.5 flex items-center justify-between border-b border-[#4A3B31] sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-sm hover:bg-[#4A3B31] text-[#F4EBDD] focus:outline-none focus-ring"
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <span className="font-editorial text-base tracking-wide font-semibold text-[#F4EBDD]">AgendaFlow</span>
            <span className="text-[10px] uppercase tracking-widest text-[#B58A55] ml-2 font-sans font-medium">Admin</span>
          </div>
        </div>

        <button
          onClick={handlePreviewCustomerPortal}
          className="text-xs flex items-center gap-1.5 text-[#F4EBDD] bg-[#4A3B31] hover:bg-[#594231] px-2.5 py-1.5 rounded-sm border border-[#80664F]/40"
        >
          <span>Preview Portal</span>
          <ExternalLink size={12} />
        </button>
      </header>

      {/* Sidebar - Desktop and Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#30251E] text-[#F4EBDD] flex flex-col justify-between border-r border-[#4A3B31] transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand header */}
          <div className="p-6 border-b border-[#4A3B31]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-editorial text-2xl tracking-wide font-semibold text-[#F4EBDD]">
                AgendaFlow
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#B58A55] font-semibold border border-[#B58A55]/40 px-2 py-0.5 rounded-xs">
                SaaS Core
              </span>
            </div>

            {/* Active Business Switcher */}
            <div className="relative">
              <label className="block text-[11px] uppercase tracking-wider text-[#D8C3A5]/70 mb-1 font-semibold">
                Active Business Context
              </label>
              <button
                onClick={() => setBusinessDropdownOpen(!businessDropdownOpen)}
                className="w-full bg-[#201813] hover:bg-[#2A201A] border border-[#4A3B31] text-[#F4EBDD] px-3 py-2.5 rounded-sm flex items-center justify-between text-left text-sm transition-colors focus-ring"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 size={16} className="text-[#B58A55] shrink-0" />
                  <div className="truncate">
                    <p className="font-medium text-xs truncate">{activeBusiness.name}</p>
                    <p className="text-[10px] text-[#D8C3A5]/60 capitalize">{activeBusiness.industry} Edition</p>
                  </div>
                </div>
                <ChevronDown size={14} className="text-[#D8C3A5] shrink-0 ml-1" />
              </button>

              {businessDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-[#201813] border border-[#4A3B31] rounded-sm shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#B58A55] font-semibold border-b border-[#4A3B31]/60">
                    Switch Industry Environment
                  </div>
                  {businesses.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        onSelectBusiness(b.id);
                        setBusinessDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#30251E] transition-colors ${
                        b.id === activeBusiness.id ? 'bg-[#30251E] text-[#B58A55] font-medium' : 'text-[#F4EBDD]/90'
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      <span className="text-[10px] text-[#D8C3A5]/50 capitalize shrink-0 ml-2">
                        {b.industry}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1" aria-label="Administrative navigation">
            <div className="px-3 pb-2 text-[11px] uppercase tracking-widest text-[#D8C3A5]/50 font-semibold">
              Management
            </div>
            {navItems.map((item) => {
              const isActive = currentPath.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-[#4A3B31] text-[#F4EBDD] border-l-2 border-[#B58A55]'
                      : 'text-[#D8C3A5]/80 hover:bg-[#3E3027] hover:text-[#F4EBDD]'
                  }`}
                >
                  <span className={isActive ? 'text-[#B58A55]' : 'text-[#D8C3A5]/70'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#4A3B31] bg-[#2A201A] space-y-3">
          <div className="flex items-center justify-between text-xs text-[#D8C3A5]/70">
            <span>Edition Badge</span>
            <Badge variant="gold" size="sm">
              {activeBusiness.config.badge}
            </Badge>
          </div>

          <button
            onClick={handlePreviewCustomerPortal}
            className="w-full flex items-center justify-center gap-2 bg-[#966F3D] hover:bg-[#856133] text-[#F4EBDD] px-3 py-2.5 rounded-sm text-xs font-semibold tracking-wide uppercase transition-colors"
          >
            <span>View Client Portal</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Operational Canvas */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Top Operational Bar */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-[#EFE5D5] border-b border-[#D8C3A5]">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-wide uppercase text-[#4A3B31]">
              {activeBusiness.name}
            </h1>
            <span className="text-xs text-[#80664F]">•</span>
            <span className="text-xs text-[#80664F]">
              Currency: {activeBusiness.currency} | Timezone: {activeBusiness.timezone}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#594231] font-medium bg-[#FAF6F0] px-3 py-1.5 rounded-sm border border-[#D8C3A5]">
              <Sparkles size={13} className="text-[#B58A55]" />
              Data Mode: Local Isolated
            </span>
            <button
              onClick={handlePreviewCustomerPortal}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#30251E] text-[#F4EBDD] hover:bg-[#4A3B31] px-3.5 py-1.5 rounded-sm transition-colors"
            >
              <span>Public Booking Portal</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
