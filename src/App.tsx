/**
 * AgendaFlow — Main Application Root
 * Product Specification v1.0 | Phase 2A: Admin Overview & Calendar
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from './utils/router.ts';
import { 
  loadStorageState, 
  setActiveBusinessId, 
  getServicesForBusiness, 
  getStaffForBusiness, 
  getAppointmentsForBusiness,
  getResourcesForBusiness,
  getCustomersForBusiness 
} from './utils/storage.ts';
import { formatCurrency, formatDuration } from './utils/formatters.ts';
import { AdminLayout } from './components/admin/AdminLayout.tsx';
import { OverviewView } from './components/admin/OverviewView.tsx';
import { CalendarView } from './components/admin/CalendarView.tsx';
import { AppointmentsLedgerView } from './components/admin/AppointmentsLedgerView.tsx';
import { ServicesManagerView } from './components/admin/ServicesManagerView.tsx';
import { TeamManagerView } from './components/admin/TeamManagerView.tsx';
import { CustomersManagerView } from './components/admin/CustomersManagerView.tsx';
import { BusinessSettingsView } from './components/admin/BusinessSettingsView.tsx';
import { CustomerLayout } from './components/customer/CustomerLayout.tsx';
import { CustomerBookingWizard } from './components/customer/CustomerBookingWizard.tsx';
import { Button } from './components/common/Button.tsx';
import { Badge } from './components/common/Badge.tsx';
import { Card } from './components/common/Card.tsx';
import { 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  Calendar as CalendarIcon,
  Tag,
  Users,
  Settings,
  Sparkles
} from 'lucide-react';

export default function App() {
  const router = useRouter();
  const [storageState, setStorageState] = useState(loadStorageState());

  // Listen to storage sync events across the application (intra-tab and cross-tab)
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setStorageState(customEvent.detail);
      } else {
        setStorageState(loadStorageState());
      }
    };

    const handleCrossTabSync = (e: StorageEvent) => {
      if (!e.key || e.key === 'agenda_flow_v1_store') {
        setStorageState(loadStorageState());
      }
    };

    window.addEventListener('agenda-flow-storage-sync', handleSync);
    window.addEventListener('storage', handleCrossTabSync);

    return () => {
      window.removeEventListener('agenda-flow-storage-sync', handleSync);
      window.removeEventListener('storage', handleCrossTabSync);
    };
  }, []);

  const { businesses, activeBusinessId } = storageState;
  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0];

  // Customer Portal business determination via query parameter (e.g., #/book?business=aura)
  const queryBusinessSlug = router.query.business;
  const customerBusiness = queryBusinessSlug
    ? businesses.find((b) => b.slug === queryBusinessSlug || b.id === queryBusinessSlug) || activeBusiness
    : activeBusiness;

  const isCustomerPortal = router.path.startsWith('/book');

  // Multi-tenant isolated datasets for active business
  const allServices = getServicesForBusiness(activeBusiness.id, true, storageState);
  const activeServices = allServices.filter(s => s.active);
  const allStaff = getStaffForBusiness(activeBusiness.id, true, storageState);
  const activeStaff = allStaff.filter(s => s.active);
  const allResources = getResourcesForBusiness(activeBusiness.id, true, storageState);
  const activeResources = allResources.filter(r => r.active);
  const customers = getCustomersForBusiness(activeBusiness.id, storageState);
  const appointments = getAppointmentsForBusiness(activeBusiness.id, storageState);

  const handleSelectBusiness = (businessId: string) => {
    setActiveBusinessId(businessId);
    setStorageState(loadStorageState());
  };

  // -------------------------------------------------------------
  // Customer Experience (Preserved completely intact)
  // -------------------------------------------------------------
  if (isCustomerPortal) {
    return (
      <CustomerLayout
        business={customerBusiness}
        onNavigateHome={() => router.navigate(`/book?business=${customerBusiness.slug}`)}
      >
        <CustomerBookingWizard
          business={customerBusiness}
          storageState={storageState}
          onNavigateAdmin={() => router.navigate('/admin/overview')}
        />
      </CustomerLayout>
    );
  }

  // -------------------------------------------------------------
  // Administrative Experience
  // -------------------------------------------------------------
  return (
    <AdminLayout
      currentPath={router.path}
      businesses={businesses}
      activeBusiness={activeBusiness}
      onSelectBusiness={handleSelectBusiness}
      onNavigate={router.navigate}
    >
      {/* Route matching for Admin modules */}
      {router.path === '/admin/settings' ? (
        <BusinessSettingsView
          business={activeBusiness}
          staff={allStaff}
          resources={allResources}
          onNavigate={router.navigate}
        />
      ) : router.path === '/admin/customers' ? (
        <CustomersManagerView
          business={activeBusiness}
          customers={customers}
          appointments={appointments}
          services={allServices}
          staff={allStaff}
          onNavigate={router.navigate}
        />
      ) : router.path === '/admin/team' ? (
        <TeamManagerView
          business={activeBusiness}
          staff={allStaff}
          services={allServices}
          onNavigate={router.navigate}
        />
      ) : router.path === '/admin/services' ? (
        <ServicesManagerView
          business={activeBusiness}
          services={allServices}
          staff={allStaff}
          onNavigate={router.navigate}
        />
      ) : router.path === '/admin/appointments' ? (
        <AppointmentsLedgerView
          business={activeBusiness}
          services={allServices}
          staff={allStaff}
          resources={activeResources}
          customers={customers}
          appointments={appointments}
          onNavigate={router.navigate}
        />
      ) : router.path === '/admin/calendar' ? (
        <CalendarView
          business={activeBusiness}
          services={activeServices}
          staff={activeStaff}
          appointments={appointments}
          onNavigate={router.navigate}
        />
      ) : router.path === '/admin/overview' || router.path === '/admin' || router.path === '/' ? (
        <OverviewView
          business={activeBusiness}
          services={activeServices}
          staff={activeStaff}
          appointments={appointments}
          onNavigate={router.navigate}
        />
      ) : (
        /* Clean placeholder for subsequent modules (Appointments Ledger, Services, Team, Settings) */
        <div className="space-y-6">
          <div className="bg-[#FAF6F0] border border-[#D8C3A5] p-6 rounded-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                Administrative Module
              </span>
              <h2 className="font-editorial text-2xl font-semibold text-[#30251E] capitalize">
                {router.path.replace('/admin/', '').replace('-', ' ')}
              </h2>
              <p className="text-xs text-[#594231] mt-1">
                Currently scoped to <strong>{activeBusiness.name}</strong> ({activeBusiness.config.badge}).
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.navigate('/admin/overview')}
            >
              Back to Overview
            </Button>
          </div>

          <Card variant="ivory" className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#EFE5D5] flex items-center justify-center text-[#80664F] mx-auto">
              <Sparkles size={24} className="text-[#B58A55]" />
            </div>

            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-editorial text-xl font-semibold text-[#30251E]">
                Module Scheduled for Subsequent Phase
              </h3>
              <p className="text-xs text-[#594231] leading-relaxed">
                The <strong>Overview</strong> and <strong>Interactive Calendar</strong> modules are fully implemented and verified in Phase 2A. Appointment creation workflows, full catalog editing, and team roster managers are scheduled for Phase 2B.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => router.navigate('/admin/overview')}
              >
                Go to Overview Dashboard
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => router.navigate('/admin/calendar')}
              >
                Open Live Calendar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
