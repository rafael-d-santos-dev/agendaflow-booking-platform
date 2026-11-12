/**
 * AgendaFlow — Admin Overview Module
 * Operational metrics, schedule summary, status distribution,
 * and upcoming appointments derived from actual stored data.
 */

import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Tag, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  UserCheck
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
  getStatusTheme 
} from '../../utils/formatters.ts';

interface OverviewViewProps {
  business: Business;
  services: Service[];
  staff: Staff[];
  appointments: Appointment[];
  onNavigate: (path: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  business,
  services,
  staff,
  appointments,
  onNavigate,
}) => {
  // Use November 10, 2026 as the reference current date (from environment metadata)
  const todayDate = new Date(2026, 10, 10);
  const todayISO = formatDateToISO(todayDate);

  // Derive genuine metrics from stored data
  const totalBookings = appointments.length;
  const confirmedBookings = appointments.filter((a) => a.status === 'confirmed');
  const pendingBookings = appointments.filter((a) => a.status === 'pending');
  const completedBookings = appointments.filter((a) => a.status === 'completed');
  const cancelledBookings = appointments.filter((a) => a.status === 'cancelled');

  // Revenue pipeline from active (non-cancelled) appointments
  const activePipelineRevenue = appointments
    .filter((a) => a.status !== 'cancelled')
    .reduce((sum, apt) => sum + (apt.price || 0), 0);

  const avgBookingValue = totalBookings > 0 && activePipelineRevenue > 0
    ? Math.round(activePipelineRevenue / (totalBookings - cancelledBookings.length || 1))
    : 0;

  // Filter today's appointments and upcoming appointments
  const todayAppointments = appointments.filter((a) => a.date === todayISO);
  
  // Sort upcoming chronologically (date ascending, time ascending)
  const sortedUpcoming = [...appointments]
    .filter((a) => a.status !== 'cancelled')
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.timeSlot.localeCompare(b.timeSlot);
    });

  const nextAppointment = sortedUpcoming[0];

  return (
    <div className="space-y-8 antialiased">
      {/* Editorial Header Banner */}
      <section className="bg-[#FAF6F0] border border-[#D8C3A5] p-6 sm:p-8 rounded-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] uppercase tracking-widest font-semibold text-[#80664F] bg-[#D8C3A5]/40 px-2.5 py-0.5 rounded-xs border border-[#D8C3A5]">
                {business.config.badge} Operations
              </span>
              <span className="text-xs text-[#80664F]">•</span>
              <span className="text-xs text-[#594231] font-medium">
                {business.address.split(',')[0]}
              </span>
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#30251E] tracking-tight">
              {business.name}
            </h1>

            <p className="text-xs sm:text-sm text-[#594231] leading-relaxed">
              {business.tagline}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('/admin/calendar')}
              leftIcon={<CalendarIcon size={16} />}
            >
              Open Calendar
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate(`/book?business=${business.slug}`)}
              rightIcon={<ArrowUpRight size={15} />}
            >
              Client Booking Portal
            </Button>
          </div>
        </div>

        {/* Operational Context Sub-bar */}
        <div className="mt-6 pt-4 border-t border-[#D8C3A5]/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-[#594231]">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">Operating Hours</span>
            <span className="font-medium text-[#30251E]">
              {business.hours.monday.open} – {business.hours.monday.close}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">Cadence Interval</span>
            <span className="font-medium text-[#30251E]">{business.config.rules.slotIntervalMinutes} min slots</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">Lead Time</span>
            <span className="font-medium text-[#30251E]">{business.config.rules.leadTimeHours}h notice required</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">Booking Flow Rule</span>
            <span className="font-medium text-[#30251E]">
              {business.config.rules.requiresSpecialistSelection ? 'Dedicated Specialist' : 'Pooled Availability'}
            </span>
          </div>
        </div>
      </section>

      {/* Key Operational Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Scheduled Revenue */}
        <Card variant="ivory" className="space-y-2">
          <div className="flex items-center justify-between text-[#80664F]">
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              Pipeline Value
            </span>
            <div className="w-8 h-8 rounded-sm bg-[#D8C3A5]/25 flex items-center justify-center text-[#B58A55]">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="font-editorial text-3xl font-semibold text-[#30251E]">
            {formatCurrency(activePipelineRevenue, business.currency)}
          </p>
          <p className="text-xs text-[#594231] flex items-center gap-1.5">
            <span>Avg. ticket: <strong>{formatCurrency(avgBookingValue, business.currency)}</strong></span>
          </p>
        </Card>

        {/* Metric 2: Total Bookings */}
        <Card variant="ivory" className="space-y-2">
          <div className="flex items-center justify-between text-[#80664F]">
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              Active Ledger
            </span>
            <div className="w-8 h-8 rounded-sm bg-[#D8C3A5]/25 flex items-center justify-center text-[#B58A55]">
              <CalendarIcon size={16} />
            </div>
          </div>
          <p className="font-editorial text-3xl font-semibold text-[#30251E]">
            {totalBookings}
          </p>
          <p className="text-xs text-[#594231]">
            {confirmedBookings.length} confirmed • {pendingBookings.length} pending
          </p>
        </Card>

        {/* Metric 3: Active Services */}
        <Card variant="ivory" className="space-y-2">
          <div className="flex items-center justify-between text-[#80664F]">
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              {business.config.terminology.services}
            </span>
            <div className="w-8 h-8 rounded-sm bg-[#D8C3A5]/25 flex items-center justify-center text-[#B58A55]">
              <Tag size={16} />
            </div>
          </div>
          <p className="font-editorial text-3xl font-semibold text-[#30251E]">
            {services.length}
          </p>
          <p className="text-xs text-[#594231]">
            Active across catalog
          </p>
        </Card>

        {/* Metric 4: Onboarded Team */}
        <Card variant="ivory" className="space-y-2">
          <div className="flex items-center justify-between text-[#80664F]">
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              {business.config.terminology.specialists}
            </span>
            <div className="w-8 h-8 rounded-sm bg-[#D8C3A5]/25 flex items-center justify-center text-[#B58A55]">
              <UserCheck size={16} />
            </div>
          </div>
          <p className="font-editorial text-3xl font-semibold text-[#30251E]">
            {staff.length}
          </p>
          <p className="text-xs text-[#594231]">
            Rostered professionals
          </p>
        </Card>
      </section>

      {/* Two Column Layout: Today's Schedule & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Schedule (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[#D8C3A5] pb-3">
            <div>
              <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-[#30251E]">
                Today&apos;s Schedule
              </h2>
              <p className="text-xs text-[#594231]">
                {formatEditorialDate(todayISO)} (Simulation Reference Date)
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('/admin/calendar')}
              rightIcon={<ArrowRight size={13} />}
            >
              View Full Week
            </Button>
          </div>

          {todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.map((apt) => {
                const service = services.find((s) => s.id === apt.serviceId);
                const specialist = staff.find((st) => st.id === apt.staffId);
                const statusMeta = getStatusTheme(apt.status);

                return (
                  <Card
                    key={apt.id}
                    variant="ivory"
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:border-[#B58A55] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 sm:w-16 py-1.5 px-2 bg-[#EFE5D5] border border-[#D8C3A5] rounded-xs text-center shrink-0">
                        <span className="font-mono text-xs font-semibold text-[#30251E] block">
                          {apt.timeSlot}
                        </span>
                        <span className="text-[10px] text-[#80664F] block">
                          {apt.endTime}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#30251E]">
                            {apt.customerName}
                          </h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-xs ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#594231] font-medium">
                          {service?.name || 'Curated Service'}
                          {specialist && (
                            <span className="text-[#80664F] font-normal">
                              {' '}with {specialist.name}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#D8C3A5]/40">
                      <span className="font-editorial text-base font-semibold text-[#30251E]">
                        {formatCurrency(apt.price, business.currency)}
                      </span>
                      <span className="font-mono text-[11px] text-[#80664F]">
                        {apt.confirmationCode}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card variant="sand" className="p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#D8C3A5]/50 flex items-center justify-center text-[#80664F] mx-auto">
                <Clock size={20} />
              </div>
              <h3 className="font-editorial text-lg font-semibold text-[#30251E]">
                No Appointments Scheduled for Today
              </h3>
              <p className="text-xs text-[#594231] max-w-md mx-auto">
                There are no client bookings registered for this specific business on {formatEditorialDate(todayISO)}.
                {nextAppointment && (
                  <span className="block mt-1 font-medium text-[#30251E]">
                    Next appointment on record: {formatEditorialDate(nextAppointment.date)} at {nextAppointment.timeSlot}.
                  </span>
                )}
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('/admin/calendar')}
                >
                  Navigate to Active Dates in Calendar
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Appointment Status Distribution (1 col on lg) */}
        <div className="space-y-4">
          <div className="border-b border-[#D8C3A5] pb-3">
            <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-[#30251E]">
              Status Distribution
            </h2>
            <p className="text-xs text-[#594231]">
              Overview across all {totalBookings} registered bookings
            </p>
          </div>

          <Card variant="ivory" className="space-y-4 p-5">
            {totalBookings > 0 ? (
              <>
                {/* Visual proportional distribution bar */}
                <div className="h-2.5 w-full bg-[#EFE5D5] rounded-xs overflow-hidden flex">
                  {confirmedBookings.length > 0 && (
                    <div
                      style={{ width: `${(confirmedBookings.length / totalBookings) * 100}%` }}
                      className="bg-[#B58A55] h-full"
                      title={`Confirmed: ${confirmedBookings.length}`}
                    />
                  )}
                  {pendingBookings.length > 0 && (
                    <div
                      style={{ width: `${(pendingBookings.length / totalBookings) * 100}%` }}
                      className="bg-[#D8C3A5] h-full"
                      title={`Pending: ${pendingBookings.length}`}
                    />
                  )}
                  {completedBookings.length > 0 && (
                    <div
                      style={{ width: `${(completedBookings.length / totalBookings) * 100}%` }}
                      className="bg-[#465945] h-full"
                      title={`Completed: ${completedBookings.length}`}
                    />
                  )}
                  {cancelledBookings.length > 0 && (
                    <div
                      style={{ width: `${(cancelledBookings.length / totalBookings) * 100}%` }}
                      className="bg-[#8C4336] h-full"
                      title={`Cancelled: ${cancelledBookings.length}`}
                    />
                  )}
                </div>

                {/* Status rows */}
                <div className="space-y-3 pt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[#30251E]">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#B58A55]" />
                      <span>Confirmed</span>
                    </span>
                    <span className="font-medium text-[#30251E]">
                      {confirmedBookings.length} ({Math.round((confirmedBookings.length / totalBookings) * 100)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[#30251E]">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#D8C3A5]" />
                      <span>Pending Review</span>
                    </span>
                    <span className="font-medium text-[#30251E]">
                      {pendingBookings.length} ({Math.round((pendingBookings.length / totalBookings) * 100)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[#30251E]">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#465945]" />
                      <span>Completed</span>
                    </span>
                    <span className="font-medium text-[#30251E]">
                      {completedBookings.length} ({Math.round((completedBookings.length / totalBookings) * 100)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[#30251E]">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#8C4336]" />
                      <span>Cancelled</span>
                    </span>
                    <span className="font-medium text-[#30251E]">
                      {cancelledBookings.length} ({Math.round((cancelledBookings.length / totalBookings) * 100)}%)
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-xs text-[#80664F]">
                No appointment status history yet.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Upcoming Appointments Table */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-[#D8C3A5] pb-3">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-[#30251E]">
              Upcoming Appointments Ledger
            </h2>
            <p className="text-xs text-[#594231]">
              Chronological schedule for {business.name}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/admin/appointments')}
          >
            View All in Ledger
          </Button>
        </div>

        <Card variant="ivory" padding="none" className="overflow-hidden border border-[#D8C3A5]">
          {sortedUpcoming.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#30251E]">
                <thead className="bg-[#EFE5D5] border-b border-[#D8C3A5] text-[11px] uppercase tracking-wider text-[#594231] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Ref Code</th>
                    <th className="py-3 px-4">{business.config.terminology.customer}</th>
                    <th className="py-3 px-4">{business.config.terminology.service}</th>
                    <th className="py-3 px-4">{business.config.terminology.specialist}</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Value</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8C3A5]/40">
                  {sortedUpcoming.map((apt) => {
                    const statusMeta = getStatusTheme(apt.status);
                    const serviceObj = services.find((s) => s.id === apt.serviceId);
                    const staffObj = staff.find((st) => st.id === apt.staffId);

                    return (
                      <tr key={apt.id} className="hover:bg-[#FAF6F0] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-[#4A3B31]">
                          {apt.confirmationCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-[#30251E]">{apt.customerName}</p>
                          <p className="text-[11px] text-[#80664F]">{apt.customerEmail}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-[#30251E]">{serviceObj?.name || 'Standard Service'}</p>
                          <p className="text-[11px] text-[#80664F]">{serviceObj ? formatDuration(serviceObj.durationMinutes) : ''}</p>
                        </td>
                        <td className="py-3.5 px-4 text-[#594231]">
                          {staffObj ? staffObj.name : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-[#30251E]">{formatEditorialDate(apt.date)}</p>
                          <p className="text-[11px] text-[#80664F]">{apt.timeSlot} – {apt.endTime}</p>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#30251E]">
                          {formatCurrency(apt.price, business.currency)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block text-[11px] px-2 py-0.5 rounded-xs ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center space-y-3">
              <p className="font-editorial text-lg text-[#30251E]">
                No Active Appointments
              </p>
              <p className="text-xs text-[#594231] max-w-sm mx-auto">
                There are currently no active bookings scheduled for {business.name}.
              </p>
            </div>
          )}
        </Card>
      </section>

      {/* Quick Navigation to Other Management Areas */}
      <section className="space-y-3 pt-4">
        <h3 className="text-xs uppercase tracking-widest font-semibold text-[#80664F]">
          Management Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate('/admin/calendar')}
            className="p-4 bg-[#FAF6F0] hover:bg-[#EFE5D5] border border-[#D8C3A5] rounded-sm text-left transition-colors flex items-center justify-between group"
          >
            <div>
              <p className="font-editorial text-base font-semibold text-[#30251E]">Interactive Calendar</p>
              <p className="text-xs text-[#594231]">Daily and weekly visual schedule</p>
            </div>
            <ArrowRight size={16} className="text-[#80664F] group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('/admin/services')}
            className="p-4 bg-[#FAF6F0] hover:bg-[#EFE5D5] border border-[#D8C3A5] rounded-sm text-left transition-colors flex items-center justify-between group"
          >
            <div>
              <p className="font-editorial text-base font-semibold text-[#30251E]">{business.config.terminology.services}</p>
              <p className="text-xs text-[#594231]">{services.length} items catalogued</p>
            </div>
            <ArrowRight size={16} className="text-[#80664F] group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('/admin/team')}
            className="p-4 bg-[#FAF6F0] hover:bg-[#EFE5D5] border border-[#D8C3A5] rounded-sm text-left transition-colors flex items-center justify-between group"
          >
            <div>
              <p className="font-editorial text-base font-semibold text-[#30251E]">{business.config.terminology.specialists}</p>
              <p className="text-xs text-[#594231]">{staff.length} rostered professionals</p>
            </div>
            <ArrowRight size={16} className="text-[#80664F] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>
    </div>
  );
};
