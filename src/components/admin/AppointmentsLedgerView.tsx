/**
 * AgendaFlow — Appointments Management Ledger Module
 * Product Specification v1.0 | Phase 2B
 * Search, filters, creation, editing, conflict validation, and status transitions.
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  RotateCcw,
  Edit2, 
  Trash2, 
  Check, 
  ChevronDown,
  Tag,
  Phone,
  Mail,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { 
  Business, 
  Service, 
  Staff, 
  Resource, 
  Customer, 
  Appointment, 
  AppointmentStatus 
} from '../../types/index.ts';
import { Card } from '../common/Card.tsx';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { 
  formatCurrency, 
  formatDuration, 
  formatEditorialDate, 
  formatDateToISO,
  getStatusTheme 
} from '../../utils/formatters.ts';
import { 
  createAppointment, 
  updateAppointment, 
  updateAppointmentStatus, 
  calculateEndTime, 
  validateAppointmentConflict 
} from '../../utils/storage.ts';

interface AppointmentsLedgerViewProps {
  business: Business;
  services: Service[];
  staff: Staff[];
  resources: Resource[];
  customers: Customer[];
  appointments: Appointment[];
  onNavigate: (path: string) => void;
  onRefreshData?: () => void;
}

export const AppointmentsLedgerView: React.FC<AppointmentsLedgerViewProps> = ({
  business,
  services,
  staff,
  resources,
  customers,
  appointments,
  onNavigate,
}) => {
  // --- Filter and Search States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // --- Modal States ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // --- Feedback / Alerts ---
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-dismiss feedback after 4 seconds
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  // --- Filter Logic ---
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // 1. Search Query (Customer name or Confirmation code)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = apt.customerName.toLowerCase().includes(q);
        const matchesCode = apt.confirmationCode.toLowerCase().includes(q);
        const matchesEmail = apt.customerEmail.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesEmail) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all' && apt.status !== statusFilter) {
        return false;
      }

      // 3. Service Filter
      if (serviceFilter !== 'all' && apt.serviceId !== serviceFilter) {
        return false;
      }

      // 4. Staff Filter
      if (staffFilter !== 'all' && apt.staffId !== staffFilter) {
        return false;
      }

      // 5. Date Filter
      if (dateFilter && apt.date !== dateFilter) {
        return false;
      }

      return true;
    });
  }, [appointments, searchQuery, statusFilter, serviceFilter, staffFilter, dateFilter]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || statusFilter !== 'all' || serviceFilter !== 'all' || staffFilter !== 'all' || dateFilter
  );

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setServiceFilter('all');
    setStaffFilter('all');
    setDateFilter('');
  };

  // --- Status Transitions ---
  const handleTransitionStatus = (apt: Appointment, targetStatus: AppointmentStatus) => {
    // If reopening cancelled appointment, re-validate availability!
    if (apt.status === 'cancelled' && targetStatus !== 'cancelled') {
      const conflictCheck = validateAppointmentConflict(
        business.id,
        apt.date,
        apt.timeSlot,
        apt.endTime,
        apt.staffId,
        apt.resourceId,
        apt.serviceId,
        apt.id,
        apt.attendeesCount || 1
      );

      if (conflictCheck.hasConflict) {
        showFeedback(
          'error',
          `Cannot reactivate reservation: ${conflictCheck.reason || 'Scheduling conflict detected.'}`
        );
        return;
      }
    }

    const success = updateAppointmentStatus(apt.id, targetStatus);
    if (success) {
      showFeedback('success', `Appointment ${apt.confirmationCode} status changed to ${targetStatus}.`);
    } else {
      showFeedback('error', 'Failed to update appointment status.');
    }
  };

  const handleConfirmCancel = () => {
    if (!cancellingAppointment) return;
    const success = updateAppointmentStatus(cancellingAppointment.id, 'cancelled');
    if (success) {
      showFeedback('success', `Appointment ${cancellingAppointment.confirmationCode} was cancelled.`);
    } else {
      showFeedback('error', 'Failed to cancel appointment.');
    }
    setCancellingAppointment(null);
  };

  return (
    <div className="space-y-6 antialiased">
      {/* Toast Feedback Notification */}
      {feedbackMessage && (
        <div
          role="status"
          className={`p-4 rounded-sm border shadow-lg flex items-center justify-between text-xs font-medium transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-[#465945]/15 border-[#465945]/40 text-[#30251E]'
              : 'bg-[#8C4336]/15 border-[#8C4336]/40 text-[#8C4336]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="text-[#465945]" />
            ) : (
              <AlertCircle size={16} className="text-[#8C4336]" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="p-1 hover:opacity-70"
            aria-label="Dismiss message"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <section className="bg-[#FAF6F0] border border-[#D8C3A5] p-6 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[#80664F] font-semibold bg-[#D8C3A5]/40 px-2 py-0.5 rounded-xs">
              {business.config.badge} Operations
            </span>
            <span className="text-xs text-[#80664F] font-mono">
              {business.name}
            </span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#30251E] mt-1">
            Appointments Management Ledger
          </h1>
          <p className="text-xs text-[#594231] mt-0.5">
            Real-time administrative ledger with conflict-free scheduling and status controls.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus size={16} />}
          >
            New Appointment
          </Button>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="bg-[#FAF6F0] border border-[#D8C3A5] p-4 rounded-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <Input
              type="text"
              placeholder="Search by customer name, ref code, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              aria-label="Filter by appointment status"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending Review</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              aria-label="Filter by service"
            >
              <option value="all">All Services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Specialist / Staff Filter */}
          <div>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              aria-label="Filter by specialist"
            >
              <option value="all">All Specialists</option>
              {staff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter & Reset Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#D8C3A5]/50 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#80664F] font-medium">Filter by Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-[#FAF6F0] text-[#30251E] px-2.5 py-1.5 rounded-sm border border-[#D8C3A5] text-xs outline-none focus:border-[#B58A55]"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[#80664F] hover:text-[#30251E] p-1"
                title="Clear date"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#594231]">
              Showing <strong>{filteredAppointments.length}</strong> of {appointments.length} records
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
        </div>
      </section>

      {/* Main Ledger Content */}
      <Card variant="ivory" padding="none" className="border border-[#D8C3A5] overflow-hidden shadow-xs">
        {filteredAppointments.length > 0 ? (
          <>
            {/* DESKTOP TABLE VIEW (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#30251E]">
                <thead className="bg-[#EFE5D5] border-b border-[#D8C3A5] text-[11px] uppercase tracking-wider text-[#594231] font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Ref Code</th>
                    <th className="py-3.5 px-4">{business.config.terminology.customer}</th>
                    <th className="py-3.5 px-4">{business.config.terminology.service}</th>
                    <th className="py-3.5 px-4">{business.config.terminology.specialist}</th>
                    <th className="py-3.5 px-4">Schedule</th>
                    <th className="py-3.5 px-4">Value</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8C3A5]/40">
                  {filteredAppointments.map((apt) => {
                    const statusMeta = getStatusTheme(apt.status);
                    const serviceObj = services.find((s) => s.id === apt.serviceId);
                    const staffObj = staff.find((st) => st.id === apt.staffId);

                    return (
                      <tr key={apt.id} className="hover:bg-[#FAF6F0] transition-colors">
                        {/* Ref Code */}
                        <td className="py-3.5 px-4 font-mono font-medium text-[#4A3B31]">
                          {apt.confirmationCode}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-[#30251E]">{apt.customerName}</p>
                          <p className="text-[11px] text-[#80664F]">{apt.customerEmail}</p>
                          {apt.customerPhone && (
                            <p className="text-[10px] text-[#80664F]/80">{apt.customerPhone}</p>
                          )}
                        </td>

                        {/* Service & Duration */}
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-[#30251E]">{serviceObj?.name || 'Service'}</p>
                          <p className="text-[11px] text-[#80664F]">
                            {serviceObj ? formatDuration(serviceObj.durationMinutes) : ''}
                          </p>
                        </td>

                        {/* Specialist */}
                        <td className="py-3.5 px-4 text-[#594231]">
                          {staffObj ? staffObj.name : '—'}
                        </td>

                        {/* Schedule */}
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-[#30251E]">{formatEditorialDate(apt.date)}</p>
                          <p className="text-[11px] font-mono text-[#80664F]">{apt.timeSlot} – {apt.endTime}</p>
                        </td>

                        {/* Value */}
                        <td className="py-3.5 px-4 font-semibold text-[#30251E]">
                          {formatCurrency(apt.price, business.currency)}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-block text-[11px] px-2.5 py-0.5 rounded-xs ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Status Quick Actions */}
                            {apt.status === 'pending' && (
                              <button
                                onClick={() => handleTransitionStatus(apt, 'confirmed')}
                                className="p-1.5 text-[#465945] hover:bg-[#465945]/15 rounded-xs transition-colors"
                                title="Confirm Appointment"
                              >
                                <Check size={16} />
                              </button>
                            )}
                            {apt.status === 'confirmed' && (
                              <button
                                onClick={() => handleTransitionStatus(apt, 'completed')}
                                className="p-1.5 text-[#465945] hover:bg-[#465945]/15 rounded-xs transition-colors"
                                title="Mark as Completed"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            {apt.status === 'cancelled' && (
                              <button
                                onClick={() => handleTransitionStatus(apt, 'confirmed')}
                                className="p-1.5 text-[#B58A55] hover:bg-[#B58A55]/15 rounded-xs transition-colors"
                                title="Reactivate Appointment"
                              >
                                <RotateCcw size={15} />
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => setEditingAppointment(apt)}
                              className="p-1.5 text-[#4A3B31] hover:bg-[#D8C3A5]/40 rounded-xs transition-colors"
                              title="Edit Details"
                            >
                              <Edit2 size={15} />
                            </button>

                            {/* Cancel Button (if active) */}
                            {apt.status !== 'cancelled' && (
                              <button
                                onClick={() => setCancellingAppointment(apt)}
                                className="p-1.5 text-[#8C4336] hover:bg-[#8C4336]/15 rounded-xs transition-colors"
                                title="Cancel Appointment"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
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
              {filteredAppointments.map((apt) => {
                const statusMeta = getStatusTheme(apt.status);
                const serviceObj = services.find((s) => s.id === apt.serviceId);
                const staffObj = staff.find((st) => st.id === apt.staffId);

                return (
                  <div key={apt.id} className="p-4 space-y-3 bg-[#FAF6F0]/40">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[11px] font-semibold text-[#80664F] block">
                          {apt.confirmationCode}
                        </span>
                        <h3 className="font-semibold text-base text-[#30251E] mt-0.5">
                          {apt.customerName}
                        </h3>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-xs shrink-0 ${statusMeta.badgeClass}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-[#594231] bg-[#EFE5D5]/50 p-2.5 rounded-xs border border-[#D8C3A5]/40">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Service</span>
                        <span className="font-medium text-[#30251E]">{serviceObj?.name || 'Service'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Value</span>
                        <span className="font-semibold text-[#30251E] font-editorial text-sm">
                          {formatCurrency(apt.price, business.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Schedule</span>
                        <span className="font-medium text-[#30251E]">{formatEditorialDate(apt.date)}</span>
                        <span className="font-mono text-[11px] text-[#80664F] block">{apt.timeSlot} – {apt.endTime}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Specialist</span>
                        <span className="font-medium text-[#30251E]">{staffObj ? staffObj.name : '—'}</span>
                      </div>
                    </div>

                    {/* Mobile Action Controls */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {apt.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTransitionStatus(apt, 'confirmed')}
                          leftIcon={<Check size={14} />}
                        >
                          Confirm
                        </Button>
                      )}
                      {apt.status === 'confirmed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTransitionStatus(apt, 'completed')}
                          leftIcon={<CheckCircle2 size={14} />}
                        >
                          Complete
                        </Button>
                      )}
                      {apt.status === 'cancelled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTransitionStatus(apt, 'confirmed')}
                          leftIcon={<RotateCcw size={14} />}
                        >
                          Reopen
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAppointment(apt)}
                        leftIcon={<Edit2 size={14} />}
                      >
                        Edit
                      </Button>

                      {apt.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancellingAppointment(apt)}
                          className="text-[#8C4336] hover:bg-[#8C4336]/10"
                          leftIcon={<Trash2 size={14} />}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EFE5D5] flex items-center justify-center text-[#80664F] mx-auto">
              <CalendarIcon size={22} className="text-[#B58A55]" />
            </div>
            <h3 className="font-editorial text-lg font-semibold text-[#30251E]">
              {hasActiveFilters ? 'No Matching Appointments Found' : 'No Appointments on Record'}
            </h3>
            <p className="text-xs text-[#594231] max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search query, status filters, or date range to find matching records.'
                : `There are currently no bookings scheduled for ${business.name}.`}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset Filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
                Create First Appointment
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* --- APPOINTMENT CREATION MODAL --- */}
      {isCreateOpen && (
        <CreateAppointmentModal
          business={business}
          services={services}
          staff={staff}
          resources={resources}
          customers={customers}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(apt) => {
            setIsCreateOpen(false);
            showFeedback('success', `Created appointment ${apt.confirmationCode} for ${apt.customerName}.`);
          }}
        />
      )}

      {/* --- APPOINTMENT EDIT MODAL --- */}
      {editingAppointment && (
        <EditAppointmentModal
          business={business}
          appointment={editingAppointment}
          services={services}
          staff={staff}
          resources={resources}
          onClose={() => setEditingAppointment(null)}
          onSuccess={(apt) => {
            setEditingAppointment(null);
            showFeedback('success', `Updated appointment ${apt.confirmationCode} successfully.`);
          }}
        />
      )}

      {/* --- CANCELLATION CONFIRMATION DIALOG --- */}
      {cancellingAppointment && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setCancellingAppointment(null)}
        >
          <div 
            className="bg-[#FAF6F0] border border-[#D8C3A5] rounded-sm max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-[#8C4336]">
              <div className="w-10 h-10 rounded-full bg-[#8C4336]/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-editorial text-lg font-semibold text-[#30251E]">
                  Confirm Cancellation
                </h3>
                <span className="font-mono text-xs text-[#80664F]">
                  Ref: {cancellingAppointment.confirmationCode}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#594231] leading-relaxed">
              Are you sure you want to cancel the appointment for <strong>{cancellingAppointment.customerName}</strong> on{' '}
              <strong>{formatEditorialDate(cancellingAppointment.date)}</strong> at <strong>{cancellingAppointment.timeSlot}</strong>?
            </p>
            <p className="text-xs text-[#80664F] bg-[#EFE5D5]/60 p-2.5 rounded-xs border border-[#D8C3A5]/40">
              Note: Cancelled appointments remain visible in the ledger under &ldquo;Cancelled&rdquo; status and release their time slot for new bookings.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancellingAppointment(null)}
              >
                Keep Appointment
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#8C4336] hover:bg-[#72362b] text-[#F4EBDD]"
                onClick={handleConfirmCancel}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: Create Appointment Modal
// =====================================================================

interface CreateModalProps {
  business: Business;
  services: Service[];
  staff: Staff[];
  resources: Resource[];
  customers: Customer[];
  onClose: () => void;
  onSuccess: (apt: Appointment) => void;
}

const CreateAppointmentModal: React.FC<CreateModalProps> = ({
  business,
  services,
  staff,
  resources,
  customers,
  onClose,
  onSuccess,
}) => {
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('new');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);
  const activeStaff = useMemo(() => staff.filter((st) => st.active), [staff]);
  const [serviceId, setServiceId] = useState(activeServices[0]?.id || services[0]?.id || '');
  const [staffId, setStaffId] = useState(activeStaff[0]?.id || '');
  const [resourceId, setResourceId] = useState(resources[0]?.id || '');
  const [date, setDate] = useState('2026-11-12');
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const activeService = useMemo(() => {
    return activeServices.find((s) => s.id === serviceId) || activeServices[0] || services[0];
  }, [activeServices, services, serviceId]);

  const calculatedEnd = useMemo(() => {
    return calculateEndTime(timeSlot, activeService?.durationMinutes || 60);
  }, [timeSlot, activeService]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Determine Customer details
    let finalName = customerName.trim();
    let finalEmail = customerEmail.trim();
    let finalPhone = customerPhone.trim();
    let finalCustomerId = `cst-${Date.now()}`;

    if (customerMode === 'existing') {
      const existing = customers.find((c) => c.id === selectedCustomerId);
      if (existing) {
        finalName = existing.name;
        finalEmail = existing.email;
        finalPhone = existing.phone;
        finalCustomerId = existing.id;
      }
    }

    if (!finalName || !finalEmail) {
      setValidationError('Customer name and email are required.');
      return;
    }

    if (!date || !timeSlot) {
      setValidationError('Please select an appointment date and start time.');
      return;
    }

    // 2. Validate Scheduling Conflict
    const conflictResult = validateAppointmentConflict(
      business.id,
      date,
      timeSlot,
      calculatedEnd,
      staffId || undefined,
      resourceId || undefined,
      serviceId,
      undefined,
      1
    );

    if (conflictResult.hasConflict) {
      setValidationError(conflictResult.reason || 'Scheduling conflict detected.');
      return;
    }

    // 3. Create Appointment
    const newAppointment = createAppointment({
      businessId: business.id,
      serviceId: activeService.id,
      staffId: staffId || undefined,
      resourceId: resourceId || undefined,
      customerId: finalCustomerId,
      customerName: finalName,
      customerEmail: finalEmail,
      customerPhone: finalPhone,
      date,
      timeSlot,
      endTime: calculatedEnd,
      status: 'confirmed',
      notes: notes.trim() || undefined,
      price: activeService.price,
      attendeesCount: 1,
    });

    onSuccess(newAppointment);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF6F0] border border-[#D8C3A5] rounded-sm max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D8C3A5] pb-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
              {business.config.badge} Concierge
            </span>
            <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
              Create New Appointment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#D8C3A5]/40 rounded-xs text-[#4A3B31]"
            aria-label="Close creation modal"
          >
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
          {/* Customer Selection Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31]">
                Customer Information
              </label>
              {customers.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('new')}
                    className={`px-2 py-0.5 rounded-xs transition-colors ${
                      customerMode === 'new'
                        ? 'bg-[#30251E] text-[#F4EBDD]'
                        : 'text-[#80664F] hover:text-[#30251E]'
                    }`}
                  >
                    New Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('existing')}
                    className={`px-2 py-0.5 rounded-xs transition-colors ${
                      customerMode === 'existing'
                        ? 'bg-[#30251E] text-[#F4EBDD]'
                        : 'text-[#80664F] hover:text-[#30251E]'
                    }`}
                  >
                    Existing ({customers.length})
                  </button>
                </div>
              )}
            </div>

            {customerMode === 'existing' && customers.length > 0 ? (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email}) — {c.totalBookings} past bookings
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Client Full Name"
                  required
                  placeholder="e.g. Vivienne Westwood"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="vivienne@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Phone Number"
                    placeholder="+1 (555) 000-0000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Service & Specialist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#D8C3A5]/50">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                {business.config.terminology.service} *
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              >
                {activeServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({formatDuration(s.durationMinutes)}) — {formatCurrency(s.price, business.currency)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                {business.config.terminology.specialist}
                {business.config.rules.requiresSpecialistSelection && ' *'}
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              >
                <option value="">Unassigned / Pool</option>
                {activeStaff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.title})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block mb-1">
                End Time (Auto)
              </label>
              <div className="w-full min-h-[44px] bg-[#EFE5D5]/60 text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5]/60 font-mono font-medium flex items-center">
                {calculatedEnd} ({formatDuration(activeService?.durationMinutes || 60)})
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
              Internal Session Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferences, allergy cautions, room requirements..."
              className="w-full bg-[#FAF6F0] text-[#30251E] text-xs p-3 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none resize-none"
            />
          </div>

          {/* Footer with Price Breakdown and Actions */}
          <div className="pt-3 border-t border-[#D8C3A5] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Total Amount</span>
              <span className="font-editorial text-xl font-semibold text-[#30251E]">
                {formatCurrency(activeService.price, business.currency)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md">
                Confirm & Create
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: Edit Appointment Modal
// =====================================================================

interface EditModalProps {
  business: Business;
  appointment: Appointment;
  services: Service[];
  staff: Staff[];
  resources: Resource[];
  onClose: () => void;
  onSuccess: (apt: Appointment) => void;
}

const EditAppointmentModal: React.FC<EditModalProps> = ({
  business,
  appointment,
  services,
  staff,
  resources,
  onClose,
  onSuccess,
}) => {
  const [serviceId, setServiceId] = useState(appointment.serviceId);
  const [staffId, setStaffId] = useState(appointment.staffId || '');
  const [resourceId, setResourceId] = useState(appointment.resourceId || '');
  const [date, setDate] = useState(appointment.date);
  const [timeSlot, setTimeSlot] = useState(appointment.timeSlot);
  const [customerName, setCustomerName] = useState(appointment.customerName);
  const [customerEmail, setCustomerEmail] = useState(appointment.customerEmail);
  const [customerPhone, setCustomerPhone] = useState(appointment.customerPhone || '');
  const [notes, setNotes] = useState(appointment.notes || '');
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedService = useMemo(() => {
    return services.find((s) => s.id === serviceId) || services[0];
  }, [services, serviceId]);

  const calculatedEnd = useMemo(() => {
    return calculateEndTime(timeSlot, selectedService?.durationMinutes || 60);
  }, [timeSlot, selectedService]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!customerName.trim() || !customerEmail.trim()) {
      setValidationError('Customer name and email are required.');
      return;
    }

    // Validate conflict (excluding current appointment ID!)
    const conflictResult = validateAppointmentConflict(
      business.id,
      date,
      timeSlot,
      calculatedEnd,
      staffId || undefined,
      resourceId || undefined,
      serviceId,
      appointment.id,
      appointment.attendeesCount || 1
    );

    if (conflictResult.hasConflict) {
      setValidationError(conflictResult.reason || 'Scheduling conflict detected.');
      return;
    }

    const updatedApt: Appointment = {
      ...appointment,
      serviceId: selectedService.id,
      staffId: staffId || undefined,
      resourceId: resourceId || undefined,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      date,
      timeSlot,
      endTime: calculatedEnd,
      status,
      notes: notes.trim() || undefined,
      price: selectedService.price,
    };

    const ok = updateAppointment(updatedApt);
    if (ok) {
      onSuccess(updatedApt);
    } else {
      setValidationError('Could not update appointment. Record may not belong to active business.');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF6F0] border border-[#D8C3A5] rounded-sm max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D8C3A5] pb-3">
          <div>
            <span className="font-mono text-[10px] text-[#80664F] block">
              Ref: {appointment.confirmationCode}
            </span>
            <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
              Edit Appointment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#D8C3A5]/40 rounded-xs text-[#4A3B31]"
            aria-label="Close edit modal"
          >
            <X size={18} />
          </button>
        </div>

        {validationError && (
          <div role="alert" className="p-3 bg-[#8C4336]/15 border border-[#8C4336]/40 text-[#8C4336] rounded-xs text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Customer Name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <Input
              label="Customer Email"
              type="email"
              required
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
            <div className="sm:col-span-2">
              <Input
                label="Customer Phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#D8C3A5]/50">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                {business.config.terminology.service}
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({formatDuration(s.durationMinutes)}) — {formatCurrency(s.price, business.currency)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                {business.config.terminology.specialist}
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              >
                <option value="">Unassigned</option>
                {staff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.title})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block mb-1">
                End Time
              </label>
              <div className="w-full min-h-[44px] bg-[#EFE5D5]/60 text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5]/60 font-mono font-medium flex items-center">
                {calculatedEnd}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              >
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending Review</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                Internal Notes
              </label>
              <textarea
                rows={1}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#FAF6F0] text-[#30251E] text-xs p-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none resize-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#D8C3A5] flex items-center justify-between">
            <span className="font-editorial text-lg font-semibold text-[#30251E]">
              {formatCurrency(selectedService.price, business.currency)}
            </span>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md">
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
