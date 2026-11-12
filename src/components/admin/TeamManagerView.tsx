/**
 * AgendaFlow — Team & Specialist Management Module
 * Product Specification v1.0 | Phase 2D.1
 * Professional directory, roster management, working schedules,
 * service eligibility, and appointment integrity.
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  UserCheck, 
  Users, 
  Tag, 
  Calendar as CalendarIcon, 
  Clock, 
  Edit2, 
  Power, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  X, 
  RotateCcw,
  Check, 
  ShieldCheck, 
  Briefcase,
  Sparkles,
  Info
} from 'lucide-react';
import { Business, Service, Staff } from '../../types/index.ts';
import { Card } from '../common/Card.tsx';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { 
  createStaff, 
  updateStaff, 
  toggleStaffActive 
} from '../../utils/storage.ts';

interface TeamManagerViewProps {
  business: Business;
  staff: Staff[];
  services: Service[];
  onNavigate: (path: string) => void;
  onRefreshData?: () => void;
}

const DAY_LABELS = [
  { dayIndex: 1, label: 'Mon', full: 'Monday' },
  { dayIndex: 2, label: 'Tue', full: 'Tuesday' },
  { dayIndex: 3, label: 'Wed', full: 'Wednesday' },
  { dayIndex: 4, label: 'Thu', full: 'Thursday' },
  { dayIndex: 5, label: 'Fri', full: 'Friday' },
  { dayIndex: 6, label: 'Sat', full: 'Saturday' },
  { dayIndex: 0, label: 'Sun', full: 'Sunday' },
];

export const TeamManagerView: React.FC<TeamManagerViewProps> = ({
  business,
  staff,
  services,
  onNavigate,
}) => {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deactivatingStaff, setDeactivatingStaff] = useState<Staff | null>(null);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Extract all unique specialties for this business
  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    staff.forEach((st) => {
      st.specialties?.forEach((spec) => {
        if (spec.trim()) set.add(spec.trim());
      });
    });
    return Array.from(set).sort();
  }, [staff]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((st) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = st.name.toLowerCase().includes(q);
        const matchesTitle = st.title.toLowerCase().includes(q);
        const matchesBio = st.bio?.toLowerCase().includes(q);
        const matchesSpec = st.specialties?.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesTitle && !matchesBio && !matchesSpec) return false;
      }

      // 2. Status Filter
      if (statusFilter === 'active' && !st.active) return false;
      if (statusFilter === 'inactive' && st.active) return false;

      // 3. Specialty Filter
      if (specialtyFilter !== 'all' && !st.specialties?.includes(specialtyFilter)) return false;

      return true;
    });
  }, [staff, searchQuery, statusFilter, specialtyFilter]);

  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter !== 'all' || specialtyFilter !== 'all');

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSpecialtyFilter('all');
  };

  const handleToggleActive = (member: Staff) => {
    if (member.active) {
      setDeactivatingStaff(member);
    } else {
      const ok = toggleStaffActive(member.id, business.id);
      if (ok) {
        showFeedback('success', `Specialist ${member.name} reactivated for bookings.`);
      } else {
        showFeedback('error', 'Failed to update specialist status.');
      }
    }
  };

  const confirmDeactivation = () => {
    if (!deactivatingStaff) return;
    const ok = toggleStaffActive(deactivatingStaff.id, business.id);
    if (ok) {
      showFeedback('success', `Specialist ${deactivatingStaff.name} deactivated. Existing reservations remain valid.`);
    } else {
      showFeedback('error', 'Failed to deactivate specialist.');
    }
    setDeactivatingStaff(null);
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
              {business.config.badge} Roster
            </span>
            <span className="text-xs text-[#80664F] font-mono">
              {business.name}
            </span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#30251E] mt-1">
            {business.config.terminology.specialists} Directory
          </h1>
          <p className="text-xs text-[#594231] mt-0.5">
            Manage professional roles, service authorizations, and weekly working schedules.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus size={16} />}
          >
            New {business.config.terminology.specialist}
          </Button>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="bg-[#FAF6F0] border border-[#D8C3A5] p-4 rounded-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="sm:col-span-2">
            <Input
              type="text"
              placeholder={`Search ${business.config.terminology.specialists.toLowerCase()} by name, role, bio, or specialty...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>

          {/* Specialty Filter */}
          <div>
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              aria-label="Filter by specialty"
            >
              <option value="all">All Specialties</option>
              {allSpecialties.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              aria-label="Filter by active state"
            >
              <option value="all">All Statuses (Active & Inactive)</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Counter and Reset */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#D8C3A5]/50">
          <span className="text-[#594231]">
            Displaying <strong>{filteredStaff.length}</strong> of {staff.length} rostered professionals
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

      {/* Team Roster List / Table */}
      <Card variant="ivory" padding="none" className="border border-[#D8C3A5] overflow-hidden shadow-xs">
        {filteredStaff.length > 0 ? (
          <>
            {/* DESKTOP TABLE VIEW (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#30251E]">
                <thead className="bg-[#EFE5D5] border-b border-[#D8C3A5] text-[11px] uppercase tracking-wider text-[#594231] font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">{business.config.terminology.specialist}</th>
                    <th className="py-3.5 px-4">Role & Specialties</th>
                    <th className="py-3.5 px-4">Authorized {business.config.terminology.services}</th>
                    <th className="py-3.5 px-4">Working Schedule</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8C3A5]/40">
                  {filteredStaff.map((member) => {
                    const initials = member.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();

                    const assignedServices = services.filter((s) => member.serviceIds?.includes(s.id));

                    return (
                      <tr key={member.id} className="hover:bg-[#FAF6F0] transition-colors">
                        {/* Name & Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-sm bg-[#D8C3A5]/50 border border-[#D8C3A5] flex items-center justify-center font-editorial font-semibold text-[#30251E] shrink-0 text-xs">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[#30251E]">{member.name}</p>
                              <p className="text-[11px] text-[#80664F]">{member.title}</p>
                            </div>
                          </div>
                        </td>

                        {/* Bio & Specialties */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-[11px] text-[#594231] line-clamp-1 mb-1">{member.bio}</p>
                          <div className="flex flex-wrap gap-1">
                            {member.specialties?.slice(0, 3).map((spec) => (
                              <span
                                key={spec}
                                className="text-[10px] bg-[#EFE5D5] text-[#594231] px-1.5 py-0.2 rounded-2xs border border-[#D8C3A5]/50"
                              >
                                {spec}
                              </span>
                            ))}
                            {member.specialties?.length > 3 && (
                              <span className="text-[10px] text-[#80664F]">
                                +{member.specialties.length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Authorized Services */}
                        <td className="py-3.5 px-4 max-w-xs">
                          {assignedServices.length > 0 ? (
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium text-[#30251E]">
                                {assignedServices.length} {assignedServices.length === 1 ? 'service' : 'services'}
                              </p>
                              <p className="text-[11px] text-[#80664F] line-clamp-1">
                                {assignedServices.map((s) => s.name).join(', ')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#80664F]/60 italic">
                              Open to all services
                            </span>
                          )}
                        </td>

                        {/* Working Schedule Days */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            {DAY_LABELS.map(({ dayIndex, label }) => {
                              const isWorking = member.availableDays?.includes(dayIndex);
                              return (
                                <span
                                  key={dayIndex}
                                  title={`${label}: ${isWorking ? 'Available' : 'Off'}`}
                                  className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-2xs border ${
                                    isWorking
                                      ? 'bg-[#30251E] text-[#F4EBDD] border-[#30251E]'
                                      : 'bg-transparent text-[#80664F]/40 border-dashed border-[#D8C3A5]/50'
                                  }`}
                                >
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Active Status */}
                        <td className="py-3.5 px-4">
                          {member.active ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-xs bg-[#465945]/15 text-[#30251E] border border-[#465945]/30 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#465945]" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-xs bg-[#8C4336]/10 text-[#8C4336] border border-[#8C4336]/30 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8C4336]" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingStaff(member)}
                              className="p-1.5 text-[#4A3B31] hover:bg-[#D8C3A5]/40 rounded-xs transition-colors"
                              title="Edit Profile & Schedule"
                            >
                              <Edit2 size={15} />
                            </button>

                            <button
                              onClick={() => handleToggleActive(member)}
                              className={`p-1.5 rounded-xs transition-colors ${
                                member.active
                                  ? 'text-[#80664F] hover:bg-[#8C4336]/10 hover:text-[#8C4336]'
                                  : 'text-[#465945] hover:bg-[#465945]/15'
                              }`}
                              title={member.active ? 'Deactivate Specialist' : 'Activate Specialist'}
                            >
                              <Power size={15} />
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
              {filteredStaff.map((member) => {
                const assignedServices = services.filter((s) => member.serviceIds?.includes(s.id));
                const initials = member.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div key={member.id} className="p-4 space-y-3 bg-[#FAF6F0]/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm bg-[#D8C3A5]/50 border border-[#D8C3A5] flex items-center justify-center font-editorial font-semibold text-[#30251E] shrink-0 text-sm">
                          {initials}
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-[#30251E]">
                            {member.name}
                          </h3>
                          <p className="text-xs text-[#80664F]">{member.title}</p>
                        </div>
                      </div>

                      {member.active ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#465945]/15 text-[#30251E] border border-[#465945]/30 font-medium shrink-0">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#8C4336]/10 text-[#8C4336] border border-[#8C4336]/30 font-medium shrink-0">
                          Inactive
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#594231] leading-relaxed">
                      {member.bio}
                    </p>

                    {/* Specialties & Services */}
                    <div className="space-y-2 bg-[#EFE5D5]/50 p-3 rounded-xs border border-[#D8C3A5]/40 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block mb-1">
                          Specialties
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {member.specialties?.map((spec) => (
                            <span
                              key={spec}
                              className="text-[10px] bg-[#FAF6F0] text-[#594231] px-1.5 py-0.5 rounded-2xs border border-[#D8C3A5]"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block mb-1">
                          Working Schedule
                        </span>
                        <div className="flex items-center gap-1">
                          {DAY_LABELS.map(({ dayIndex, label }) => {
                            const isWorking = member.availableDays?.includes(dayIndex);
                            return (
                              <span
                                key={dayIndex}
                                className={`text-[9px] font-semibold px-1 py-0.5 rounded-2xs border ${
                                  isWorking
                                    ? 'bg-[#30251E] text-[#F4EBDD] border-[#30251E]'
                                    : 'bg-transparent text-[#80664F]/40 border-dashed border-[#D8C3A5]/50'
                                }`}
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block mb-0.5">
                          Assigned Services ({assignedServices.length})
                        </span>
                        <p className="text-[11px] text-[#594231]">
                          {assignedServices.length > 0
                            ? assignedServices.map((s) => s.name).join(', ')
                            : 'All catalog services'}
                        </p>
                      </div>
                    </div>

                    {/* Mobile Action Controls */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingStaff(member)}
                        leftIcon={<Edit2 size={14} />}
                      >
                        Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(member)}
                        className={member.active ? 'text-[#8C4336] border-[#8C4336]/40' : 'text-[#465945] border-[#465945]/40'}
                        leftIcon={<Power size={14} />}
                      >
                        {member.active ? 'Deactivate' : 'Activate'}
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
              {hasActiveFilters ? 'No Matching Team Members Found' : 'No Specialists Roster Configured'}
            </h3>
            <p className="text-xs text-[#594231] max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try broadening your search term or adjusting status and specialty filters.'
                : `There are currently no staff members registered for ${business.name}.`}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset Filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
                Add First {business.config.terminology.specialist}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* --- CREATE STAFF MODAL --- */}
      {isCreateOpen && (
        <CreateStaffModal
          business={business}
          services={services}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(newMember) => {
            setIsCreateOpen(false);
            showFeedback('success', `Added ${newMember.name} to roster.`);
          }}
        />
      )}

      {/* --- EDIT STAFF MODAL --- */}
      {editingStaff && (
        <EditStaffModal
          business={business}
          member={editingStaff}
          services={services}
          onClose={() => setEditingStaff(null)}
          onSuccess={(updatedMember) => {
            setEditingStaff(null);
            showFeedback('success', `Updated ${updatedMember.name}'s profile and schedule.`);
          }}
        />
      )}

      {/* --- DEACTIVATION CONFIRMATION MODAL --- */}
      {deactivatingStaff && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setDeactivatingStaff(null)}
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
                  Deactivate Specialist?
                </h3>
                <span className="text-xs text-[#80664F]">{deactivatingStaff.name} ({deactivatingStaff.title})</span>
              </div>
            </div>

            <p className="text-xs text-[#594231] leading-relaxed">
              Deactivating this professional will immediately remove them from available specialists for new bookings.
            </p>

            <div className="p-3 bg-[#EFE5D5]/60 rounded-xs border border-[#D8C3A5]/50 flex items-start gap-2.5 text-xs text-[#594231]">
              <ShieldCheck size={16} className="text-[#465945] shrink-0 mt-0.5" />
              <span>
                <strong>Appointment Integrity:</strong> All existing past and upcoming appointments booked with {deactivatingStaff.name} remain completely valid and intact in the ledger.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeactivatingStaff(null)}
              >
                Keep Active
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#8C4336] hover:bg-[#72362b] text-[#F4EBDD]"
                onClick={confirmDeactivation}
              >
                Confirm Deactivation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: Create Staff Modal
// =====================================================================

interface CreateStaffModalProps {
  business: Business;
  services: Service[];
  onClose: () => void;
  onSuccess: (st: Staff) => void;
}

const CreateStaffModal: React.FC<CreateStaffModalProps> = ({
  business,
  services,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [specialtiesText, setSpecialtiesText] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(services.map((s) => s.id));
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri
  const [active, setActive] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const toggleDay = (dayIndex: number) => {
    if (availableDays.includes(dayIndex)) {
      setAvailableDays(availableDays.filter((d) => d !== dayIndex));
    } else {
      setAvailableDays([...availableDays, dayIndex].sort());
    }
  };

  const toggleService = (srvId: string) => {
    if (selectedServiceIds.includes(srvId)) {
      setSelectedServiceIds(selectedServiceIds.filter((id) => id !== srvId));
    } else {
      setSelectedServiceIds([...selectedServiceIds, srvId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const finalName = name.trim();
    if (!finalName) {
      setValidationError('Professional name is required.');
      return;
    }

    const finalTitle = title.trim();
    if (!finalTitle) {
      setValidationError('Professional title/role is required.');
      return;
    }

    if (active && availableDays.length === 0) {
      setValidationError('Please select at least one working day for active staff.');
      return;
    }

    const specialties = specialtiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const created = createStaff({
      businessId: business.id,
      name: finalName,
      title: finalTitle,
      bio: bio.trim(),
      specialties: specialties.length > 0 ? specialties : ['General Practice'],
      serviceIds: selectedServiceIds,
      availableDays,
      active,
    });

    onSuccess(created);
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
              {business.config.badge} Team
            </span>
            <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
              Add New {business.config.terminology.specialist}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Full Name *"
              required
              placeholder="e.g. Alister Saint-Germain"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="Role or Title *"
              required
              placeholder={
                business.industry === 'salon'
                  ? 'e.g. Master Stylist'
                  : business.industry === 'clinic'
                  ? 'e.g. Functional Clinician'
                  : business.industry === 'consulting'
                  ? 'e.g. Senior Managing Partner'
                  : business.industry === 'fitness'
                  ? 'e.g. Head Coach'
                  : 'e.g. Lead Stage Operator'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
              Professional Biography
            </label>
            <textarea
              rows={2}
              required
              placeholder="Background, qualifications, philosophy, and experience..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[#FAF6F0] text-[#30251E] text-xs p-3 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none resize-none"
            />
          </div>

          <Input
            label="Specialties (Comma Separated)"
            placeholder="e.g. Editorial Cuts, Dry Cutting, Scalp Rituals"
            value={specialtiesText}
            onChange={(e) => setSpecialtiesText(e.target.value)}
            helperText="Separate multiple specialties with commas."
          />

          {/* Working Schedule (Available Days) */}
          <div className="p-3 bg-[#EFE5D5]/60 rounded-xs border border-[#D8C3A5]/50 space-y-2">
            <span className="text-[10px] uppercase font-semibold text-[#80664F] tracking-wider block">
              Weekly Working Schedule (Available Days) *
            </span>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map(({ dayIndex, label, full }) => {
                const isSelected = availableDays.includes(dayIndex);
                return (
                  <button
                    key={dayIndex}
                    type="button"
                    onClick={() => toggleDay(dayIndex)}
                    className={`px-3 py-1.5 rounded-xs text-xs font-medium transition-colors border ${
                      isSelected
                        ? 'bg-[#30251E] text-[#F4EBDD] border-[#30251E]'
                        : 'bg-[#FAF6F0] text-[#80664F] border-[#D8C3A5] hover:border-[#80664F]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#594231]">
              Selected days define slot availability in the booking engine and calendar.
            </p>
          </div>

          {/* Service Authorizations */}
          {services.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1.5">
                Authorized {business.config.terminology.services}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2.5 bg-[#FAF6F0] border border-[#D8C3A5] rounded-xs">
                {services.map((srv) => {
                  const isChecked = selectedServiceIds.includes(srv.id);
                  return (
                    <label key={srv.id} className="flex items-center gap-2 text-xs text-[#30251E] cursor-pointer hover:bg-[#EFE5D5]/40 p-1 rounded-2xs">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleService(srv.id)}
                        className="accent-[#30251E]"
                      />
                      <span className="truncate">{srv.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-[#D8C3A5] flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[#30251E] cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="accent-[#30251E]"
              />
              <span>Active in booking roster</span>
            </label>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md">
                Add to Team
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: Edit Staff Modal
// =====================================================================

interface EditStaffModalProps {
  business: Business;
  member: Staff;
  services: Service[];
  onClose: () => void;
  onSuccess: (st: Staff) => void;
}

const EditStaffModal: React.FC<EditStaffModalProps> = ({
  business,
  member,
  services,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(member.name);
  const [title, setTitle] = useState(member.title);
  const [bio, setBio] = useState(member.bio || '');
  const [specialtiesText, setSpecialtiesText] = useState(member.specialties?.join(', ') || '');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(member.serviceIds || []);
  const [availableDays, setAvailableDays] = useState<number[]>(member.availableDays || [1, 2, 3, 4, 5]);
  const [active, setActive] = useState(member.active);
  const [validationError, setValidationError] = useState<string | null>(null);

  const toggleDay = (dayIndex: number) => {
    if (availableDays.includes(dayIndex)) {
      setAvailableDays(availableDays.filter((d) => d !== dayIndex));
    } else {
      setAvailableDays([...availableDays, dayIndex].sort());
    }
  };

  const toggleService = (srvId: string) => {
    if (selectedServiceIds.includes(srvId)) {
      setSelectedServiceIds(selectedServiceIds.filter((id) => id !== srvId));
    } else {
      setSelectedServiceIds([...selectedServiceIds, srvId]);
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const finalName = name.trim();
    if (!finalName) {
      setValidationError('Name cannot be empty.');
      return;
    }

    const finalTitle = title.trim();
    if (!finalTitle) {
      setValidationError('Title cannot be empty.');
      return;
    }

    if (active && availableDays.length === 0) {
      setValidationError('Active staff must have at least one working day.');
      return;
    }

    const specialties = specialtiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: Staff = {
      ...member,
      name: finalName,
      title: finalTitle,
      bio: bio.trim(),
      specialties: specialties.length > 0 ? specialties : member.specialties,
      serviceIds: selectedServiceIds,
      availableDays,
      active,
    };

    const ok = updateStaff(updated);
    if (ok) {
      onSuccess(updated);
    } else {
      setValidationError('Failed to update staff record.');
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
              ID: {member.id}
            </span>
            <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
              Edit {business.config.terminology.specialist} Profile
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

        {/* Appointment Integrity Assurance Banner */}
        <div className="p-3 bg-[#EFE5D5]/70 rounded-xs border border-[#D8C3A5]/60 flex items-start gap-2.5 text-xs text-[#594231]">
          <Info size={16} className="text-[#80664F] shrink-0 mt-0.5" />
          <span>
            <strong>Historical Integrity:</strong> Changes to schedule or service eligibility apply to future bookings only. Existing appointments in the ledger remain safely assigned to {member.name}.
          </span>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Full Name *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="Role or Title *"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
              Professional Biography
            </label>
            <textarea
              rows={2}
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[#FAF6F0] text-[#30251E] text-xs p-3 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none resize-none"
            />
          </div>

          <Input
            label="Specialties (Comma Separated)"
            value={specialtiesText}
            onChange={(e) => setSpecialtiesText(e.target.value)}
          />

          {/* Working Schedule (Available Days) */}
          <div className="p-3 bg-[#EFE5D5]/60 rounded-xs border border-[#D8C3A5]/50 space-y-2">
            <span className="text-[10px] uppercase font-semibold text-[#80664F] tracking-wider block">
              Weekly Working Schedule (Available Days) *
            </span>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map(({ dayIndex, label }) => {
                const isSelected = availableDays.includes(dayIndex);
                return (
                  <button
                    key={dayIndex}
                    type="button"
                    onClick={() => toggleDay(dayIndex)}
                    className={`px-3 py-1.5 rounded-xs text-xs font-medium transition-colors border ${
                      isSelected
                        ? 'bg-[#30251E] text-[#F4EBDD] border-[#30251E]'
                        : 'bg-[#FAF6F0] text-[#80664F] border-[#D8C3A5] hover:border-[#80664F]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Service Authorizations */}
          {services.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1.5">
                Authorized {business.config.terminology.services}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2.5 bg-[#FAF6F0] border border-[#D8C3A5] rounded-xs">
                {services.map((srv) => {
                  const isChecked = selectedServiceIds.includes(srv.id);
                  return (
                    <label key={srv.id} className="flex items-center gap-2 text-xs text-[#30251E] cursor-pointer hover:bg-[#EFE5D5]/40 p-1 rounded-2xs">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleService(srv.id)}
                        className="accent-[#30251E]"
                      />
                      <span className="truncate">{srv.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-[#D8C3A5] flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[#30251E] cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="accent-[#30251E]"
              />
              <span>Active in booking roster</span>
            </label>

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
