/**
 * AgendaFlow — Customer Management & CRM Module
 * Product Specification v1.0 | Phase 2D.2
 * Client directory, relationship history, lifetime metrics,
 * duplicate prevention, and appointment history inspection.
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  User, 
  Mail, 
  Phone, 
  Calendar as CalendarIcon, 
  Clock, 
  Tag, 
  Edit2, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  RotateCcw, 
  FileText, 
  ShieldCheck, 
  TrendingUp,
  History,
  Info
} from 'lucide-react';
import { Business, Customer, Appointment, Service, Staff } from '../../types/index.ts';
import { Card } from '../common/Card.tsx';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { 
  formatCurrency, 
  formatEditorialDate, 
  formatShortDate,
  getStatusTheme 
} from '../../utils/formatters.ts';
import { 
  createCustomer, 
  updateCustomer, 
  getCustomerAppointments 
} from '../../utils/storage.ts';

interface CustomersManagerViewProps {
  business: Business;
  customers: Customer[];
  appointments: Appointment[];
  services: Service[];
  staff: Staff[];
  onNavigate: (path: string) => void;
  onRefreshData?: () => void;
}

export const CustomersManagerView: React.FC<CustomersManagerViewProps> = ({
  business,
  customers,
  appointments,
  services,
  staff,
  onNavigate,
}) => {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'zero'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'bookings' | 'recent'>('recent');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Helper to compute customer's lifetime stats from actual appointment records
  const getCustomerStats = useMemo(() => {
    return (c: Customer) => {
      const apts = getCustomerAppointments(c.id, c.email, business.id, { appointments } as any);
      const nonCancelled = apts.filter((a) => a.status !== 'cancelled');
      const totalSpend = nonCancelled.reduce((sum, a) => sum + (a.price || 0), 0);
      const lastApt = apts[0]; // sorted newest first

      return {
        totalBookings: apts.length,
        activeBookings: nonCancelled.length,
        totalSpend,
        lastAppointment: lastApt,
      };
    };
  }, [appointments, business.id]);

  // Overall directory metrics
  const directoryTotals = useMemo(() => {
    const totalClients = customers.length;
    let clientsWithBookings = 0;
    let combinedSpend = 0;

    customers.forEach((c) => {
      const stats = getCustomerStats(c);
      if (stats.totalBookings > 0) clientsWithBookings++;
      combinedSpend += stats.totalSpend;
    });

    const avgSpend = totalClients > 0 ? Math.round(combinedSpend / totalClients) : 0;

    return { totalClients, clientsWithBookings, combinedSpend, avgSpend };
  }, [customers, getCustomerStats]);

  // Filtered and sorted customers list
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        // 1. Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = c.name.toLowerCase().includes(q);
          const matchesEmail = c.email.toLowerCase().includes(q);
          const matchesPhone = c.phone?.toLowerCase().includes(q);
          const matchesNotes = c.notes?.toLowerCase().includes(q);
          if (!matchesName && !matchesEmail && !matchesPhone && !matchesNotes) return false;
        }

        // 2. Activity Filter
        const stats = getCustomerStats(c);
        if (activityFilter === 'active' && stats.totalBookings === 0) return false;
        if (activityFilter === 'zero' && stats.totalBookings > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'bookings') {
          const aCount = getCustomerStats(a).totalBookings;
          const bCount = getCustomerStats(b).totalBookings;
          return bCount - aCount;
        }
        // recent
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [customers, searchQuery, activityFilter, sortBy, getCustomerStats]);

  const hasActiveFilters = Boolean(searchQuery.trim() || activityFilter !== 'all' || sortBy !== 'recent');

  const resetFilters = () => {
    setSearchQuery('');
    setActivityFilter('all');
    setSortBy('recent');
  };

  return (
    <div className="space-y-6 antialiased">
      {/* Toast Feedback */}
      {feedback && (
        <div
          role="status"
          className={`p-4 rounded-sm border shadow-lg flex items-center justify-between text-xs font-medium transition-all ${
            feedback.type === 'success'
              ? 'bg-[#465945]/15 border-[#465945]/40 text-[#30251E]'
              : 'bg-[#8C4336]/15 border-[#8C4336]/40 text-[#8C4336]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-[#465945]" />
            ) : (
              <AlertCircle size={16} className="text-[#8C4336]" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <section className="bg-[#FAF6F0] border border-[#D8C3A5] p-6 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[#80664F] font-semibold bg-[#D8C3A5]/40 px-2 py-0.5 rounded-xs">
              {business.config.badge} Client CRM
            </span>
            <span className="text-xs text-[#80664F] font-mono">
              {business.name}
            </span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#30251E] mt-1">
            {business.config.terminology.customer}s Directory
          </h1>
          <p className="text-xs text-[#594231] mt-0.5">
            Client profiles, reservation histories, and lifetime engagement records.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus size={16} />}
          >
            New {business.config.terminology.customer}
          </Button>
        </div>
      </section>

      {/* High-Level Directory Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="ivory" className="space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-[#80664F] font-semibold flex items-center justify-between">
            <span>Total Client Directory</span>
            <Users size={14} className="text-[#B58A55]" />
          </span>
          <p className="font-editorial text-3xl font-semibold text-[#30251E]">
            {directoryTotals.totalClients}
          </p>
          <p className="text-xs text-[#594231]">
            Registered in {business.name}
          </p>
        </Card>

        <Card variant="ivory" className="space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-[#80664F] font-semibold flex items-center justify-between">
            <span>Active Clients</span>
            <CheckCircle2 size={14} className="text-[#465945]" />
          </span>
          <p className="font-editorial text-3xl font-semibold text-[#30251E]">
            {directoryTotals.clientsWithBookings}
          </p>
          <p className="text-xs text-[#594231]">
            With 1+ reservations on record
          </p>
        </Card>

        <Card variant="ivory" className="space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-[#80664F] font-semibold flex items-center justify-between">
            <span>Client Pipeline Total</span>
            <TrendingUp size={14} className="text-[#B58A55]" />
          </span>
          <p className="font-editorial text-3xl font-semibold text-[#30251E]">
            {formatCurrency(directoryTotals.combinedSpend, business.currency)}
          </p>
          <p className="text-xs text-[#594231]">
            Avg. lifetime: <strong>{formatCurrency(directoryTotals.avgSpend, business.currency)}</strong>
          </p>
        </Card>
      </section>

      {/* Search and Filters Bar */}
      <section className="bg-[#FAF6F0] border border-[#D8C3A5] p-4 rounded-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="sm:col-span-2">
            <Input
              type="text"
              placeholder={`Search ${business.config.terminology.customer.toLowerCase()}s by name, email, phone, or notes...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>

          {/* Activity Filter */}
          <div>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value as 'all' | 'active' | 'zero')}
              className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              aria-label="Filter by reservation activity"
            >
              <option value="all">All Reservation Activity</option>
              <option value="active">Active (Has Bookings)</option>
              <option value="zero">First-Time / Zero Bookings</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'bookings' | 'recent')}
              className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              aria-label="Sort clients by"
            >
              <option value="recent">Sort: Recently Registered</option>
              <option value="bookings">Sort: Most Bookings</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Counter and Reset */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#D8C3A5]/50">
          <span className="text-[#594231]">
            Displaying <strong>{filteredCustomers.length}</strong> of {customers.length} client accounts
          </span>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              leftIcon={<RotateCcw size={12} />}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </section>

      {/* Directory Table / Cards */}
      <Card variant="ivory" padding="none" className="border border-[#D8C3A5] overflow-hidden shadow-xs">
        {filteredCustomers.length > 0 ? (
          <>
            {/* DESKTOP TABLE VIEW (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#30251E]">
                <thead className="bg-[#EFE5D5] border-b border-[#D8C3A5] text-[11px] uppercase tracking-wider text-[#594231] font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">{business.config.terminology.customer}</th>
                    <th className="py-3.5 px-4">Contact Details</th>
                    <th className="py-3.5 px-4">Registered</th>
                    <th className="py-3.5 px-4">Bookings</th>
                    <th className="py-3.5 px-4">Lifetime Value</th>
                    <th className="py-3.5 px-4">Latest Reservation</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8C3A5]/40">
                  {filteredCustomers.map((customer) => {
                    const stats = getCustomerStats(customer);
                    const initials = customer.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();

                    const lastAptService = stats.lastAppointment
                      ? services.find((s) => s.id === stats.lastAppointment?.serviceId)
                      : null;

                    return (
                      <tr key={customer.id} className="hover:bg-[#FAF6F0] transition-colors">
                        {/* Name & Monogram */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-sm bg-[#D8C3A5]/50 border border-[#D8C3A5] flex items-center justify-center font-editorial font-semibold text-[#30251E] shrink-0 text-xs">
                              {initials}
                            </div>
                            <div>
                              <button
                                onClick={() => setSelectedCustomer(customer)}
                                className="font-semibold text-sm text-[#30251E] hover:text-[#966F3D] transition-colors text-left"
                              >
                                {customer.name}
                              </button>
                              {customer.notes && (
                                <p className="text-[10px] text-[#80664F] line-clamp-1 italic max-w-xs">
                                  &ldquo;{customer.notes}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-[#30251E]">{customer.email}</p>
                          <p className="text-[11px] text-[#80664F]">{customer.phone || '—'}</p>
                        </td>

                        {/* Registered */}
                        <td className="py-3.5 px-4 text-[#594231]">
                          {customer.createdAt ? formatShortDate(customer.createdAt.split('T')[0]) : '—'}
                        </td>

                        {/* Total Bookings */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-xs bg-[#EFE5D5] text-[#30251E] border border-[#D8C3A5]/60">
                            {stats.totalBookings} {stats.totalBookings === 1 ? 'booking' : 'bookings'}
                          </span>
                        </td>

                        {/* Lifetime Spend */}
                        <td className="py-3.5 px-4 font-editorial text-sm font-semibold text-[#30251E]">
                          {formatCurrency(stats.totalSpend, business.currency)}
                        </td>

                        {/* Latest Reservation */}
                        <td className="py-3.5 px-4 text-[#594231]">
                          {stats.lastAppointment ? (
                            <div>
                              <p className="font-medium text-[#30251E]">
                                {formatShortDate(stats.lastAppointment.date)} ({stats.lastAppointment.timeSlot})
                              </p>
                              <p className="text-[11px] text-[#80664F] line-clamp-1">
                                {lastAptService?.name || 'Service'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[#80664F]/60 text-[11px] italic">No reservations</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedCustomer(customer)}
                              className="p-1.5 text-[#30251E] hover:bg-[#D8C3A5]/40 rounded-xs transition-colors"
                              title="View Client History"
                            >
                              <History size={15} />
                            </button>

                            <button
                              onClick={() => setEditingCustomer(customer)}
                              className="p-1.5 text-[#4A3B31] hover:bg-[#D8C3A5]/40 rounded-xs transition-colors"
                              title="Edit Client Info"
                            >
                              <Edit2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW (< 768px) */}
            <div className="md:hidden divide-y divide-[#D8C3A5]/50">
              {filteredCustomers.map((customer) => {
                const stats = getCustomerStats(customer);
                const initials = customer.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                const lastAptService = stats.lastAppointment
                  ? services.find((s) => s.id === stats.lastAppointment?.serviceId)
                  : null;

                return (
                  <div key={customer.id} className="p-4 space-y-3 bg-[#FAF6F0]/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm bg-[#D8C3A5]/50 border border-[#D8C3A5] flex items-center justify-center font-editorial font-semibold text-[#30251E] shrink-0 text-sm">
                          {initials}
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-[#30251E]">
                            {customer.name}
                          </h3>
                          <p className="text-xs text-[#80664F]">{customer.email}</p>
                        </div>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#EFE5D5] text-[#30251E] border border-[#D8C3A5]/60 font-semibold shrink-0">
                        {stats.totalBookings} booked
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#EFE5D5]/50 p-2.5 rounded-xs border border-[#D8C3A5]/40">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Phone</span>
                        <span className="font-medium text-[#30251E]">{customer.phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Lifetime Value</span>
                        <span className="font-editorial text-base font-semibold text-[#30251E]">
                          {formatCurrency(stats.totalSpend, business.currency)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Latest Session</span>
                        <span className="text-xs text-[#594231]">
                          {stats.lastAppointment
                            ? `${formatEditorialDate(stats.lastAppointment.date)} (${stats.lastAppointment.timeSlot}) — ${lastAptService?.name || 'Service'}`
                            : 'No reservation history yet'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCustomer(customer)}
                        leftIcon={<History size={14} />}
                      >
                        History
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCustomer(customer)}
                        leftIcon={<Edit2 size={14} />}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EFE5D5] flex items-center justify-center text-[#80664F] mx-auto">
              <Users size={22} className="text-[#B58A55]" />
            </div>
            <h3 className="font-editorial text-lg font-semibold text-[#30251E]">
              {hasActiveFilters ? 'No Matching Clients Found' : 'No Clients Registered Yet'}
            </h3>
            <p className="text-xs text-[#594231] max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try broadening your search term or resetting your filters.'
                : `There are currently no customer profiles registered for ${business.name}.`}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset Filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
                Add First {business.config.terminology.customer}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* --- CREATE CUSTOMER MODAL --- */}
      {isCreateOpen && (
        <CreateCustomerModal
          business={business}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(newCust) => {
            setIsCreateOpen(false);
            showFeedback('success', `Created client record for "${newCust.name}".`);
          }}
        />
      )}

      {/* --- EDIT CUSTOMER MODAL --- */}
      {editingCustomer && (
        <EditCustomerModal
          business={business}
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={(updatedCust) => {
            setEditingCustomer(null);
            showFeedback('success', `Updated client record for "${updatedCust.name}".`);
          }}
        />
      )}

      {/* --- CUSTOMER DETAIL / HISTORY MODAL --- */}
      {selectedCustomer && (
        <CustomerDetailModal
          business={business}
          customer={selectedCustomer}
          appointments={appointments}
          services={services}
          staff={staff}
          onClose={() => setSelectedCustomer(null)}
          onInspectAppointment={(aptId) => {
            setSelectedCustomer(null);
            onNavigate('/admin/appointments');
          }}
        />
      )}
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: Create Customer Modal (Duplicate Prevention)
// =====================================================================

interface CreateCustomerModalProps {
  business: Business;
  onClose: () => void;
  onSuccess: (c: Customer) => void;
}

const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  business,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const finalName = name.trim();
    if (!finalName) {
      setValidationError('Customer full name is required.');
      return;
    }

    const finalEmail = email.trim();
    if (!finalEmail || !finalEmail.includes('@') || !finalEmail.includes('.')) {
      setValidationError('A valid email address is required.');
      return;
    }

    const result = createCustomer({
      businessId: business.id,
      name: finalName,
      email: finalEmail,
      phone: phone.trim(),
      notes: notes.trim() || undefined,
    });

    if (result.error) {
      setValidationError(result.error);
      return;
    }

    if (result.customer) {
      onSuccess(result.customer);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF6F0] border border-[#D8C3A5] rounded-sm max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D8C3A5] pb-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
              {business.config.badge} Client CRM
            </span>
            <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
              Register New {business.config.terminology.customer}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#D8C3A5]/40 rounded-xs text-[#4A3B31]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {validationError && (
          <div role="alert" className="p-3 bg-[#8C4336]/15 border border-[#8C4336]/40 text-[#8C4336] rounded-xs text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            required
            placeholder="e.g. Cassandra Sterling"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Email Address *"
            type="email"
            required
            placeholder="cassandra.sterling@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            helperText="Duplicate emails within this business directory are automatically prevented."
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+1 (555) 234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
              Internal Client Notes & Preferences
            </label>
            <textarea
              rows={2}
              placeholder="Beverage preferences, allergies, executive briefing notes, private requests..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#FAF6F0] text-[#30251E] text-xs p-3 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none resize-none"
            />
          </div>

          <div className="pt-3 border-t border-[#D8C3A5] flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              Create Client Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: Edit Customer Modal
// =====================================================================

interface EditCustomerModalProps {
  business: Business;
  customer: Customer;
  onClose: () => void;
  onSuccess: (c: Customer) => void;
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  business,
  customer,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email);
  const [phone, setPhone] = useState(customer.phone || '');
  const [notes, setNotes] = useState(customer.notes || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const finalName = name.trim();
    if (!finalName) {
      setValidationError('Customer full name is required.');
      return;
    }

    const finalEmail = email.trim();
    if (!finalEmail || !finalEmail.includes('@') || !finalEmail.includes('.')) {
      setValidationError('A valid email address is required.');
      return;
    }

    const updated: Customer = {
      ...customer,
      name: finalName,
      email: finalEmail,
      phone: phone.trim(),
      notes: notes.trim() || undefined,
    };

    const result = updateCustomer(updated);
    if (!result.success) {
      setValidationError(result.error || 'Failed to update customer record.');
      return;
    }

    onSuccess(updated);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF6F0] border border-[#D8C3A5] rounded-sm max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D8C3A5] pb-3">
          <div>
            <span className="font-mono text-[10px] text-[#80664F] block">
              ID: {customer.id}
            </span>
            <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
              Edit {business.config.terminology.customer} Record
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#D8C3A5]/40 rounded-xs text-[#4A3B31]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {validationError && (
          <div role="alert" className="p-3 bg-[#8C4336]/15 border border-[#8C4336]/40 text-[#8C4336] rounded-xs text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="p-3 bg-[#EFE5D5]/70 rounded-xs border border-[#D8C3A5]/60 flex items-start gap-2.5 text-xs text-[#594231]">
          <Info size={16} className="text-[#80664F] shrink-0 mt-0.5" />
          <span>
            <strong>Historical Integrity:</strong> Updates apply to client directory details and future bookings. Historical prices and service records on existing appointments remain safely preserved.
          </span>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Full Name *"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Email Address *"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
              Internal Client Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#FAF6F0] text-[#30251E] text-xs p-3 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none resize-none"
            />
          </div>

          <div className="pt-3 border-t border-[#D8C3A5] flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: Customer Detail & History Modal
// =====================================================================

interface CustomerDetailModalProps {
  business: Business;
  customer: Customer;
  appointments: Appointment[];
  services: Service[];
  staff: Staff[];
  onClose: () => void;
  onInspectAppointment: (aptId: string) => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  business,
  customer,
  appointments,
  services,
  staff,
  onClose,
  onInspectAppointment,
}) => {
  const clientApts = useMemo(() => {
    return getCustomerAppointments(customer.id, customer.email, business.id, { appointments } as any);
  }, [customer, business.id, appointments]);

  const nonCancelled = clientApts.filter((a) => a.status !== 'cancelled');
  const totalSpend = nonCancelled.reduce((sum, a) => sum + (a.price || 0), 0);
  const completedCount = clientApts.filter((a) => a.status === 'completed').length;
  const cancelledCount = clientApts.filter((a) => a.status === 'cancelled').length;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF6F0] border border-[#D8C3A5] rounded-sm max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#D8C3A5] pb-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
              {business.config.badge} Client Dossier
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#30251E]">
              {customer.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#594231]">
              <span className="inline-flex items-center gap-1">
                <Mail size={13} className="text-[#80664F]" />
                {customer.email}
              </span>
              {customer.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={13} className="text-[#80664F]" />
                  {customer.phone}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#D8C3A5]/40 rounded-xs text-[#4A3B31]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Lifetime Engagement Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-[#EFE5D5] rounded-xs border border-[#D8C3A5]">
            <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Total Bookings</span>
            <span className="font-editorial text-xl font-semibold text-[#30251E] mt-0.5 block">
              {clientApts.length}
            </span>
          </div>

          <div className="p-3 bg-[#EFE5D5] rounded-xs border border-[#D8C3A5]">
            <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Completed</span>
            <span className="font-editorial text-xl font-semibold text-[#465945] mt-0.5 block">
              {completedCount}
            </span>
          </div>

          <div className="p-3 bg-[#EFE5D5] rounded-xs border border-[#D8C3A5]">
            <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Cancelled</span>
            <span className="font-editorial text-xl font-semibold text-[#8C4336] mt-0.5 block">
              {cancelledCount}
            </span>
          </div>

          <div className="p-3 bg-[#EFE5D5] rounded-xs border border-[#D8C3A5]">
            <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Lifetime Value</span>
            <span className="font-editorial text-xl font-semibold text-[#30251E] mt-0.5 block">
              {formatCurrency(totalSpend, business.currency)}
            </span>
          </div>
        </div>

        {/* Client Notes if present */}
        {customer.notes && (
          <div className="p-3.5 bg-[#FAF6F0] rounded-xs border border-[#D8C3A5] space-y-1">
            <span className="text-[10px] uppercase font-semibold text-[#80664F] tracking-wider block">
              Client Preferences & Internal Notes
            </span>
            <p className="text-xs text-[#30251E] leading-relaxed">
              {customer.notes}
            </p>
          </div>
        )}

        {/* Chronological Appointment History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#D8C3A5] pb-2">
            <h3 className="font-editorial text-lg font-semibold text-[#30251E] flex items-center gap-2">
              <History size={16} className="text-[#B58A55]" />
              Reservation History ({clientApts.length})
            </h3>
            <span className="text-xs text-[#80664F]">
              Direct ledger link available
            </span>
          </div>

          {clientApts.length > 0 ? (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {clientApts.map((apt) => {
                const serviceObj = services.find((s) => s.id === apt.serviceId);
                const staffObj = staff.find((st) => st.id === apt.staffId);
                const statusMeta = getStatusTheme(apt.status);

                return (
                  <div
                    key={apt.id}
                    className="p-3 bg-[#FAF6F0] border border-[#D8C3A5] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#B58A55] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#4A3B31]">
                          {apt.confirmationCode}
                        </span>
                        <span className={`text-[10px] px-2 py-0.2 rounded-2xs ${statusMeta.badgeClass}`}>
                          {statusMeta.label}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-[#30251E]">
                        {serviceObj?.name || 'Service'}
                        {staffObj && (
                          <span className="text-[#80664F] font-normal">
                            {' '}with {staffObj.name}
                          </span>
                        )}
                      </p>

                      <p className="text-[11px] text-[#594231] font-medium">
                        {formatEditorialDate(apt.date)} • {apt.timeSlot} – {apt.endTime}
                      </p>
                    </div>

                    <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#D8C3A5]/40">
                      <span className="font-editorial text-base font-semibold text-[#30251E]">
                        {formatCurrency(apt.price, business.currency)}
                      </span>
                      <button
                        onClick={() => onInspectAppointment(apt.id)}
                        className="text-[10px] text-[#B58A55] hover:text-[#966F3D] font-semibold uppercase tracking-wider inline-flex items-center gap-1 mt-0.5"
                      >
                        <span>View in Ledger</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[#80664F] bg-[#EFE5D5]/40 rounded-xs border border-[#D8C3A5]/50">
              This client has no recorded reservations yet.
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-[#D8C3A5] flex items-center justify-end">
          <Button variant="outline" size="md" onClick={onClose}>
            Close Dossier
          </Button>
        </div>
      </div>
    </div>
  );
};
