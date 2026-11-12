/**
 * AgendaFlow — Admin Calendar Module
 * Interactive Day & Week scheduling views, responsive mobile agenda,
 * real timeline slots, and appointment detail inspection.
 */

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Tag,
  MapPin,
  X
} from 'lucide-react';
import { Business, Service, Staff, Appointment } from '../../types/index.ts';
import { Card } from '../common/Card.tsx';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { 
  formatCurrency, 
  formatDuration, 
  formatEditorialDate, 
  formatDateToISO,
  parseISODate,
  getWeekDates,
  formatMonthYear,
  formatDayHeader,
  getStatusTheme,
  isSameDay
} from '../../utils/formatters.ts';

interface CalendarViewProps {
  business: Business;
  services: Service[];
  staff: Staff[];
  appointments: Appointment[];
  onNavigate: (path: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  business,
  services,
  staff,
  appointments,
  onNavigate,
}) => {
  // Reference date: November 10, 2026 (Tuesday)
  const initialDate = useMemo(() => new Date(2026, 10, 10), []);

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Time grid definition: 08:00 to 20:00 (covers typical salon/clinic/studio hours)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 8; h <= 20; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Compute week dates for current date
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  // Navigate functions
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setDate(currentDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date(initialDate));
  };

  // Helper to get appointments for a specific day
  const getAppointmentsForDay = (date: Date) => {
    const iso = formatDateToISO(date);
    return appointments
      .filter((a) => a.date === iso)
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  };

  const dayAppointments = useMemo(() => {
    return getAppointmentsForDay(currentDate);
  }, [currentDate, appointments]);

  return (
    <div className="space-y-6 antialiased">
      {/* Calendar Header Controls */}
      <section className="bg-[#FAF6F0] border border-[#D8C3A5] p-4 sm:p-6 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[#80664F] font-semibold bg-[#D8C3A5]/40 px-2 py-0.5 rounded-xs">
                {business.config.badge} Calendar
              </span>
              <span className="text-xs text-[#80664F] font-mono">
                {business.timezone}
              </span>
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#30251E] mt-1">
              {formatMonthYear(currentDate)}
            </h1>
          </div>

          {/* Date Navigation Controls */}
          <div className="flex items-center gap-1.5 bg-[#EFE5D5] p-1 rounded-sm border border-[#D8C3A5] self-start sm:self-auto">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xs hover:bg-[#D8C3A5]/50 text-[#30251E] transition-colors focus-ring"
              aria-label="Previous time period"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#30251E] hover:bg-[#D8C3A5]/50 rounded-xs transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-xs hover:bg-[#D8C3A5]/50 text-[#30251E] transition-colors focus-ring"
              aria-label="Next time period"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* View Mode Toggle & Ledger Link */}
        <div className="flex items-center gap-3 justify-between md:justify-end">
          {/* View toggle (desktop/tablet only, mobile stays in day view for optimal ergonomics) */}
          <div className="hidden sm:inline-flex bg-[#EFE5D5] p-1 rounded-sm border border-[#D8C3A5]">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors ${
                viewMode === 'day'
                  ? 'bg-[#30251E] text-[#F4EBDD] shadow-xs'
                  : 'text-[#4A3B31] hover:text-[#30251E]'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors ${
                viewMode === 'week'
                  ? 'bg-[#30251E] text-[#F4EBDD] shadow-xs'
                  : 'text-[#4A3B31] hover:text-[#30251E]'
              }`}
            >
              Week View
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/admin/appointments')}
          >
            Manage in Ledger
          </Button>
        </div>
      </section>

      {/* Mobile-Only Day Selector (Quick Days Carousel) */}
      <div className="sm:hidden bg-[#FAF6F0] p-2 border border-[#D8C3A5] rounded-sm overflow-x-auto flex gap-2">
        {weekDates.map((date) => {
          const { dayName, dayNumber } = formatDayHeader(date);
          const isSelected = isSameDay(date, currentDate);
          const isToday = isSameDay(date, initialDate);
          const dayApts = getAppointmentsForDay(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => {
                setCurrentDate(date);
                setViewMode('day');
              }}
              className={`flex-1 min-w-[52px] py-2 px-1 text-center rounded-xs transition-all ${
                isSelected
                  ? 'bg-[#30251E] text-[#F4EBDD]'
                  : 'hover:bg-[#EFE5D5] text-[#30251E]'
              }`}
            >
              <span className="text-[10px] uppercase font-semibold block text-opacity-80">
                {dayName}
              </span>
              <span className="font-editorial text-base font-semibold block">
                {dayNumber}
              </span>
              {dayApts.length > 0 && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-[#B58A55]' : 'bg-[#966F3D]'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* WEEK VIEW (Desktops & Tablets >= 640px) */}
      {viewMode === 'week' && (
        <div className="hidden sm:block border border-[#D8C3A5] bg-[#FAF6F0] rounded-sm overflow-hidden shadow-xs">
          {/* Week Header */}
          <div className="grid grid-cols-7 border-b border-[#D8C3A5] bg-[#EFE5D5] text-center">
            {weekDates.map((date) => {
              const { dayName, dayNumber } = formatDayHeader(date);
              const isToday = isSameDay(date, initialDate);
              const isSelected = isSameDay(date, currentDate);
              const aptsCount = getAppointmentsForDay(date).length;

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => setCurrentDate(date)}
                  className={`py-3 px-2 border-r last:border-r-0 border-[#D8C3A5]/60 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#FAF6F0]' : 'hover:bg-[#E7D5BA]/50'
                  }`}
                >
                  <span className="text-[11px] uppercase tracking-wider text-[#80664F] font-semibold block">
                    {dayName}
                  </span>
                  <div className="flex items-center justify-center gap-1.5 mt-0.5">
                    <span
                      className={`font-editorial text-lg font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full ${
                        isToday
                          ? 'bg-[#B58A55] text-[#F4EBDD]'
                          : 'text-[#30251E]'
                      }`}
                    >
                      {dayNumber}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#80664F] block mt-1">
                    {aptsCount > 0 ? `${aptsCount} booking${aptsCount > 1 ? 's' : ''}` : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Week Day Columns */}
          <div className="grid grid-cols-7 min-h-[460px] divide-x divide-[#D8C3A5]/60">
            {weekDates.map((date) => {
              const dayApts = getAppointmentsForDay(date);

              return (
                <div
                  key={date.toISOString()}
                  className="p-2 space-y-2 bg-[#FAF6F0]/40 flex flex-col"
                >
                  {dayApts.length > 0 ? (
                    dayApts.map((apt) => {
                      const service = services.find((s) => s.id === apt.serviceId);
                      const specialist = staff.find((st) => st.id === apt.staffId);
                      const statusMeta = getStatusTheme(apt.status);

                      return (
                        <div
                          key={apt.id}
                          onClick={() => setSelectedAppointment(apt)}
                          className="p-2.5 bg-[#FAF6F0] hover:bg-[#EFE5D5] border border-[#D8C3A5] hover:border-[#B58A55] rounded-xs cursor-pointer transition-all shadow-xs text-left group"
                        >
                          <div className="flex items-center justify-between text-[10px] text-[#80664F] mb-1 font-mono">
                            <span className="font-semibold text-[#30251E]">{apt.timeSlot}</span>
                            <span>{apt.endTime}</span>
                          </div>

                          <p className="text-xs font-semibold text-[#30251E] line-clamp-1 group-hover:text-[#966F3D] transition-colors">
                            {apt.customerName}
                          </p>

                          <p className="text-[11px] text-[#594231] line-clamp-1 mt-0.5">
                            {service?.name || 'Service'}
                          </p>

                          {specialist && (
                            <p className="text-[10px] text-[#80664F] line-clamp-1 mt-0.5">
                              {specialist.name}
                            </p>
                          )}

                          <div className="mt-2 flex items-center justify-between border-t border-[#D8C3A5]/40 pt-1.5">
                            <span className="text-[10px] font-semibold text-[#30251E]">
                              {formatCurrency(apt.price, business.currency)}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-2xs ${statusMeta.badgeClass}`}>
                              {statusMeta.label}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-3 text-center text-[11px] text-[#80664F]/60">
                      No bookings
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DAY VIEW / MOBILE AGENDA VIEW */}
      {(viewMode === 'day' || true) && (
        <div className={viewMode === 'week' ? 'sm:hidden' : 'block'}>
          <div className="border border-[#D8C3A5] bg-[#FAF6F0] rounded-sm overflow-hidden">
            <div className="p-4 bg-[#EFE5D5] border-b border-[#D8C3A5] flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#80664F] font-semibold block">
                  Daily Timeline
                </span>
                <h3 className="font-editorial text-lg font-semibold text-[#30251E]">
                  {formatEditorialDate(formatDateToISO(currentDate))}
                </h3>
              </div>
              <Badge variant="sand">
                {dayAppointments.length} Booked
              </Badge>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {dayAppointments.length > 0 ? (
                <div className="space-y-3">
                  {dayAppointments.map((apt) => {
                    const service = services.find((s) => s.id === apt.serviceId);
                    const specialist = staff.find((st) => st.id === apt.staffId);
                    const statusMeta = getStatusTheme(apt.status);

                    return (
                      <div
                        key={apt.id}
                        onClick={() => setSelectedAppointment(apt)}
                        className="p-4 bg-[#FAF6F0] hover:bg-[#EFE5D5] border border-[#D8C3A5] hover:border-[#B58A55] rounded-xs cursor-pointer transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-16 py-1.5 bg-[#EFE5D5] border border-[#D8C3A5] rounded-xs text-center shrink-0">
                            <span className="font-mono text-xs font-semibold text-[#30251E] block">
                              {apt.timeSlot}
                            </span>
                            <span className="text-[10px] text-[#80664F] block">
                              {apt.endTime}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-[#30251E]">
                                {apt.customerName}
                              </h4>
                              <span className={`text-[10px] px-2 py-0.5 rounded-xs ${statusMeta.badgeClass}`}>
                                {statusMeta.label}
                              </span>
                            </div>

                            <p className="text-xs text-[#594231] font-medium">
                              {service?.name || 'Curated Service'}
                              {service && (
                                <span className="text-[#80664F] font-normal">
                                  {' '}• {formatDuration(service.durationMinutes)}
                                </span>
                              )}
                            </p>

                            {specialist && (
                              <p className="text-xs text-[#80664F]">
                                Specialist: <span className="text-[#30251E] font-medium">{specialist.name}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#D8C3A5]/40 text-right">
                          <span className="font-editorial text-base font-semibold text-[#30251E]">
                            {formatCurrency(apt.price, business.currency)}
                          </span>
                          <span className="font-mono text-xs text-[#80664F]">
                            {apt.confirmationCode}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#D8C3A5]/40 flex items-center justify-center text-[#80664F] mx-auto">
                    <Clock size={18} />
                  </div>
                  <h4 className="font-editorial text-base font-semibold text-[#30251E]">
                    No Scheduled Sessions for this Date
                  </h4>
                  <p className="text-xs text-[#594231] max-w-sm mx-auto">
                    The calendar for {formatEditorialDate(formatDateToISO(currentDate))} is currently clear. Use previous or next controls to inspect upcoming sessions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPOINTMENT DETAIL INSPECTION MODAL */}
      {selectedAppointment && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedAppointment(null)}
        >
          <div 
            className="bg-[#FAF6F0] border border-[#D8C3A5] rounded-sm max-w-lg w-full p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#D8C3A5] pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                  Reservation Voucher
                </span>
                <h3 className="font-editorial text-xl font-semibold text-[#30251E]">
                  {selectedAppointment.customerName}
                </h3>
                <span className="font-mono text-xs text-[#80664F]">
                  Ref: {selectedAppointment.confirmationCode}
                </span>
              </div>

              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-1.5 hover:bg-[#D8C3A5]/40 rounded-xs text-[#4A3B31] transition-colors"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#EFE5D5]/70 rounded-xs border border-[#D8C3A5]/50">
                <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Service</span>
                <span className="font-medium text-[#30251E] text-sm mt-0.5 block">
                  {services.find((s) => s.id === selectedAppointment.serviceId)?.name || 'Service'}
                </span>
              </div>

              <div className="p-3 bg-[#EFE5D5]/70 rounded-xs border border-[#D8C3A5]/50">
                <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Schedule</span>
                <span className="font-medium text-[#30251E] text-sm mt-0.5 block">
                  {selectedAppointment.timeSlot} – {selectedAppointment.endTime}
                </span>
                <span className="text-[11px] text-[#80664F]">
                  {formatEditorialDate(selectedAppointment.date)}
                </span>
              </div>

              <div className="p-3 bg-[#EFE5D5]/70 rounded-xs border border-[#D8C3A5]/50">
                <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Client Contact</span>
                <span className="font-medium text-[#30251E] block mt-0.5">
                  {selectedAppointment.customerEmail}
                </span>
                <span className="text-[#80664F]">
                  {selectedAppointment.customerPhone}
                </span>
              </div>

              <div className="p-3 bg-[#EFE5D5]/70 rounded-xs border border-[#D8C3A5]/50">
                <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Billing Value</span>
                <span className="font-editorial text-lg font-semibold text-[#30251E] mt-0.5 block">
                  {formatCurrency(selectedAppointment.price, business.currency)}
                </span>
                <span className="text-[10px] text-[#465945] font-medium">Verified local record</span>
              </div>
            </div>

            {selectedAppointment.notes && (
              <div className="p-3 bg-[#EFE5D5]/40 rounded-xs border border-[#D8C3A5]/40 text-xs">
                <span className="text-[10px] uppercase font-semibold text-[#80664F] block mb-1">Session Notes</span>
                <p className="text-[#594231]">{selectedAppointment.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#D8C3A5]">
              <span className={`text-xs px-2.5 py-1 rounded-xs ${getStatusTheme(selectedAppointment.status).badgeClass}`}>
                {getStatusTheme(selectedAppointment.status).label}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAppointment(null)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedAppointment(null);
                    onNavigate('/admin/appointments');
                  }}
                >
                  Open in Ledger
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
