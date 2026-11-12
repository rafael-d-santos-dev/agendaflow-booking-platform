/**
 * AgendaFlow — Business Settings & Booking Policies Module
 * Product Specification v1.0 | Phase 2E
 * Administrative configuration for business profiles, operating hours,
 * holidays, booking policies, industry terminology, team availability,
 * and physical/virtual resources.
 */

import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Clock, 
  ShieldCheck, 
  Sliders, 
  Users, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Plus, 
  Trash2, 
  Edit2, 
  Calendar as CalendarIcon, 
  Save, 
  X, 
  Info, 
  Sparkles,
  Power,
  RotateCcw,
  Check
} from 'lucide-react';
import { 
  Business, 
  Staff, 
  Resource, 
  SpecialClosure, 
  StaffSchedule, 
  IndustryRules, 
  IndustryTerminology,
  BusinessHours
} from '../../types/index.ts';
import { Card } from '../common/Card.tsx';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { 
  updateBusinessProfile, 
  updateBusinessHours, 
  updateBookingPolicies, 
  updateBusinessTerminology,
  addSpecialClosure, 
  deleteSpecialClosure, 
  updateStaffSchedule,
  createResource,
  updateResource,
  toggleResourceActive
} from '../../utils/storage.ts';

interface BusinessSettingsViewProps {
  business: Business;
  staff: Staff[];
  resources: Resource[];
  onNavigate: (path: string) => void;
  onRefreshData?: () => void;
}

type SettingsTab = 'profile' | 'hours' | 'policies' | 'industry' | 'team' | 'resources';

const DAYS_OF_WEEK: Array<{ key: keyof Business['hours']; label: string; short: string }> = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 23; h++) {
  const hh = String(h).padStart(2, '0');
  TIME_OPTIONS.push(`${hh}:00`);
  TIME_OPTIONS.push(`${hh}:30`);
}

export const BusinessSettingsView: React.FC<BusinessSettingsViewProps> = ({
  business,
  staff,
  resources,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // =========================================================================
  // TAB 1: Business Profile State
  // =========================================================================
  const [profileName, setProfileName] = useState(business.name);
  const [profileTagline, setProfileTagline] = useState(business.tagline);
  const [profileDescription, setProfileDescription] = useState(business.description);
  const [profileEmail, setProfileEmail] = useState(business.email);
  const [profilePhone, setProfilePhone] = useState(business.phone);
  const [profileAddress, setProfileAddress] = useState(business.address);
  const [profileTimezone, setProfileTimezone] = useState(business.timezone);
  const [profileCurrency, setProfileCurrency] = useState(business.currency);

  // Sync profile when business changes
  React.useEffect(() => {
    setProfileName(business.name);
    setProfileTagline(business.tagline);
    setProfileDescription(business.description);
    setProfileEmail(business.email);
    setProfilePhone(business.phone);
    setProfileAddress(business.address);
    setProfileTimezone(business.timezone);
    setProfileCurrency(business.currency);
  }, [business.id]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showFeedback('error', 'Business name is required.');
      return;
    }
    if (!profileEmail.trim() || !profileEmail.includes('@')) {
      showFeedback('error', 'A valid contact email is required.');
      return;
    }

    const success = updateBusinessProfile(business.id, {
      name: profileName.trim(),
      tagline: profileTagline.trim(),
      description: profileDescription.trim(),
      email: profileEmail.trim(),
      phone: profilePhone.trim(),
      address: profileAddress.trim(),
      timezone: profileTimezone.trim(),
      currency: profileCurrency.trim().toUpperCase(),
    });

    if (success) {
      showFeedback('success', 'Business profile updated successfully.');
    } else {
      showFeedback('error', 'Failed to update business profile.');
    }
  };

  // =========================================================================
  // TAB 2: Operating Hours & Special Closures State
  // =========================================================================
  const [hoursState, setHoursState] = useState<Business['hours']>(business.hours);

  React.useEffect(() => {
    setHoursState(business.hours);
  }, [business.id, business.hours]);

  const handleHourToggle = (day: keyof Business['hours']) => {
    setHoursState(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen,
      },
    }));
  };

  const handleHourChange = (day: keyof Business['hours'], field: 'open' | 'close', value: string) => {
    setHoursState(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleApplyMondayToAll = () => {
    const mondayHours = hoursState.monday;
    const updated: Business['hours'] = { ...hoursState };
    DAYS_OF_WEEK.forEach(({ key }) => {
      if (key !== 'saturday' && key !== 'sunday') {
        updated[key] = { ...mondayHours };
      }
    });
    setHoursState(updated);
    showFeedback('success', 'Monday operating hours applied to all weekdays (Mon–Fri).');
  };

  const handleSaveHours = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate each open day: close must be after open
    for (const { key, label } of DAYS_OF_WEEK) {
      const h = hoursState[key];
      if (h.isOpen) {
        if (h.open >= h.close) {
          showFeedback('error', `Invalid hours for ${label}: Closing time (${h.close}) must be later than opening time (${h.open}).`);
          return;
        }
      }
    }

    const success = updateBusinessHours(business.id, hoursState);
    if (success) {
      showFeedback('success', 'Weekly operating hours saved successfully.');
    } else {
      showFeedback('error', 'Failed to save operating hours.');
    }
  };

  // Special Closures
  const [closureDate, setClosureDate] = useState('');
  const [closureReason, setClosureReason] = useState('');
  const [isFullDayClosure, setIsFullDayClosure] = useState(true);
  const [specialOpen, setSpecialOpen] = useState('10:00');
  const [specialClose, setSpecialClose] = useState('14:00');

  const handleAddClosure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closureDate.trim()) {
      showFeedback('error', 'Please specify a closure date.');
      return;
    }
    if (!closureReason.trim()) {
      showFeedback('error', 'Please provide a reason or holiday name.');
      return;
    }
    if (!isFullDayClosure && specialOpen >= specialClose) {
      showFeedback('error', 'Special closing time must be later than opening time.');
      return;
    }

    const result = addSpecialClosure(business.id, {
      date: closureDate,
      reason: closureReason.trim(),
      isFullDay: isFullDayClosure,
      specialHours: isFullDayClosure ? undefined : { open: specialOpen, close: specialClose },
    });

    if (result.success) {
      setClosureDate('');
      setClosureReason('');
      setIsFullDayClosure(true);
      showFeedback('success', 'Special closure / holiday scheduled.');
    } else {
      showFeedback('error', result.error || 'Failed to add closure.');
    }
  };

  const handleDeleteClosure = (closureId: string) => {
    const success = deleteSpecialClosure(business.id, closureId);
    if (success) {
      showFeedback('success', 'Special closure removed.');
    } else {
      showFeedback('error', 'Failed to remove special closure.');
    }
  };

  // =========================================================================
  // TAB 3: Booking Policies State
  // =========================================================================
  const existingRules = business.config.rules;
  const [leadTimeHours, setLeadTimeHours] = useState(existingRules.leadTimeHours || 2);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(existingRules.maxAdvanceDays || 60);
  const [cancellationNoticeHours, setCancellationNoticeHours] = useState(existingRules.cancellationNoticeHours || 24);
  const [rescheduleNoticeHours, setRescheduleNoticeHours] = useState(existingRules.rescheduleNoticeHours || 12);
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(existingRules.slotIntervalMinutes || 30);
  const [bufferMinutes, setBufferMinutes] = useState(existingRules.bufferMinutes || 15);

  React.useEffect(() => {
    setLeadTimeHours(business.config.rules.leadTimeHours || 2);
    setMaxAdvanceDays(business.config.rules.maxAdvanceDays || 60);
    setCancellationNoticeHours(business.config.rules.cancellationNoticeHours || 24);
    setRescheduleNoticeHours(business.config.rules.rescheduleNoticeHours || 12);
    setSlotIntervalMinutes(business.config.rules.slotIntervalMinutes || 30);
    setBufferMinutes(business.config.rules.bufferMinutes || 15);
  }, [business.id, business.config.rules]);

  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    if (leadTimeHours < 0 || maxAdvanceDays <= 0 || slotIntervalMinutes <= 0) {
      showFeedback('error', 'Booking policy values must be positive integers.');
      return;
    }

    const success = updateBookingPolicies(business.id, {
      leadTimeHours: Number(leadTimeHours),
      maxAdvanceDays: Number(maxAdvanceDays),
      cancellationNoticeHours: Number(cancellationNoticeHours),
      rescheduleNoticeHours: Number(rescheduleNoticeHours),
      slotIntervalMinutes: Number(slotIntervalMinutes),
      bufferMinutes: Number(bufferMinutes),
    });

    if (success) {
      showFeedback('success', 'Booking policies updated and stored.');
    } else {
      showFeedback('error', 'Failed to update booking policies.');
    }
  };

  // =========================================================================
  // TAB 4: Industry Configuration & Terminology State
  // =========================================================================
  const [termService, setTermService] = useState(business.config.terminology.service);
  const [termServices, setTermServices] = useState(business.config.terminology.services);
  const [termSpecialist, setTermSpecialist] = useState(business.config.terminology.specialist);
  const [termSpecialists, setTermSpecialists] = useState(business.config.terminology.specialists);
  const [termCustomer, setTermCustomer] = useState(business.config.terminology.customer);
  const [termBookingAction, setTermBookingAction] = useState(business.config.terminology.bookingAction);

  const [ruleSpecialistRequired, setRuleSpecialistRequired] = useState(business.config.rules.requiresSpecialistSelection);
  const [ruleAllowGroup, setRuleAllowGroup] = useState(business.config.rules.allowsGroupBooking);
  const [ruleDefaultCapacity, setRuleDefaultCapacity] = useState(business.config.rules.defaultMaxCapacity || 1);
  const [ruleResourceRequired, setRuleResourceRequired] = useState(business.config.rules.requiresResourceAssignment);

  React.useEffect(() => {
    setTermService(business.config.terminology.service);
    setTermServices(business.config.terminology.services);
    setTermSpecialist(business.config.terminology.specialist);
    setTermSpecialists(business.config.terminology.specialists);
    setTermCustomer(business.config.terminology.customer);
    setTermBookingAction(business.config.terminology.bookingAction);

    setRuleSpecialistRequired(business.config.rules.requiresSpecialistSelection);
    setRuleAllowGroup(business.config.rules.allowsGroupBooking);
    setRuleDefaultCapacity(business.config.rules.defaultMaxCapacity || 1);
    setRuleResourceRequired(business.config.rules.requiresResourceAssignment);
  }, [business.id, business.config]);

  const handleSaveIndustryConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termService.trim() || !termSpecialist.trim() || !termCustomer.trim()) {
      showFeedback('error', 'Industry terminology labels cannot be empty.');
      return;
    }

    const tSuccess = updateBusinessTerminology(business.id, {
      service: termService.trim(),
      services: termServices.trim(),
      specialist: termSpecialist.trim(),
      specialists: termSpecialists.trim(),
      customer: termCustomer.trim(),
      bookingAction: termBookingAction.trim(),
    });

    const rSuccess = updateBookingPolicies(business.id, {
      requiresSpecialistSelection: ruleSpecialistRequired,
      allowsGroupBooking: ruleAllowGroup,
      defaultMaxCapacity: Math.max(1, Number(ruleDefaultCapacity)),
      requiresResourceAssignment: ruleResourceRequired,
    });

    if (tSuccess && rSuccess) {
      showFeedback('success', 'Industry configuration and terminology updated.');
    } else {
      showFeedback('error', 'Failed to update industry configuration.');
    }
  };

  // =========================================================================
  // TAB 5: Team Availability State & Modal
  // =========================================================================
  const [editingStaffMember, setEditingStaffMember] = useState<Staff | null>(null);

  // =========================================================================
  // TAB 6: Resources State & Modals
  // =========================================================================
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const activeResourcesCount = resources.filter(r => r.active).length;
  const totalCapacityCount = resources.reduce((sum, r) => sum + (r.active ? r.capacity : 0), 0);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8C3A5] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold">
              Operational Governance
            </span>
            <span className="text-xs text-[#80664F]">•</span>
            <span className="text-[10px] uppercase tracking-wider text-[#B58A55] font-semibold">
              {business.config.badge}
            </span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#30251E] mt-0.5">
            Business Settings & Policies
          </h1>
          <p className="text-xs text-[#594231] mt-0.5">
            Configure profile, weekly operating hours, booking rules, staff schedules, and capacity limits.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="taupe" size="md">
            ID: <span className="font-mono ml-1 font-semibold text-[#30251E]">{business.id}</span>
          </Badge>
          <Badge variant="gold" size="md">
            Industry: <span className="uppercase ml-1 font-semibold">{business.industry}</span>
          </Badge>
        </div>
      </section>

      {/* Global Toast Feedback */}
      {feedback && (
        <div
          role="alert"
          className={`p-3.5 rounded-sm border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-[#E7ECE4] border-[#7F997B] text-[#2D3E2B]'
              : 'bg-[#FBEBE8] border-[#DDA399] text-[#7A291D]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)} 
            className="p-1 hover:opacity-75"
            aria-label="Dismiss message"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav 
        className="flex border-b border-[#D8C3A5] gap-1 sm:gap-2 overflow-x-auto scrollbar-none"
        aria-label="Settings Sections"
      >
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'profile'
              ? 'border-[#B58A55] text-[#30251E] font-semibold bg-[#D8C3A5]/15'
              : 'border-transparent text-[#80664F] hover:text-[#30251E] hover:border-[#D8C3A5]'
          }`}
        >
          <Building2 size={15} />
          <span>Business Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('hours')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'hours'
              ? 'border-[#B58A55] text-[#30251E] font-semibold bg-[#D8C3A5]/15'
              : 'border-transparent text-[#80664F] hover:text-[#30251E] hover:border-[#D8C3A5]'
          }`}
        >
          <Clock size={15} />
          <span>Operating Hours & Closures</span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'policies'
              ? 'border-[#B58A55] text-[#30251E] font-semibold bg-[#D8C3A5]/15'
              : 'border-transparent text-[#80664F] hover:text-[#30251E] hover:border-[#D8C3A5]'
          }`}
        >
          <ShieldCheck size={15} />
          <span>Booking Policies</span>
        </button>

        <button
          onClick={() => setActiveTab('industry')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'industry'
              ? 'border-[#B58A55] text-[#30251E] font-semibold bg-[#D8C3A5]/15'
              : 'border-transparent text-[#80664F] hover:text-[#30251E] hover:border-[#D8C3A5]'
          }`}
        >
          <Sliders size={15} />
          <span>Industry Configuration</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'team'
              ? 'border-[#B58A55] text-[#30251E] font-semibold bg-[#D8C3A5]/15'
              : 'border-transparent text-[#80664F] hover:text-[#30251E] hover:border-[#D8C3A5]'
          }`}
        >
          <Users size={15} />
          <span>Team Availability</span>
        </button>

        <button
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'resources'
              ? 'border-[#B58A55] text-[#30251E] font-semibold bg-[#D8C3A5]/15'
              : 'border-transparent text-[#80664F] hover:text-[#30251E] hover:border-[#D8C3A5]'
          }`}
        >
          <Layers size={15} />
          <span>Resources & Capacity</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D8C3A5]/30 font-semibold">
            {resources.length}
          </span>
        </button>
      </nav>

      {/* ===================================================================== */}
      {/* TAB 1: BUSINESS PROFILE */}
      {/* ===================================================================== */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card variant="ivory" className="p-6 space-y-6">
            <div className="border-b border-[#D8C3A5] pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-editorial text-lg font-semibold text-[#30251E]">
                  Business Identity & Contact Details
                </h2>
                <p className="text-xs text-[#594231] mt-0.5">
                  Public brand information presented on appointment confirmations and customer concierge.
                </p>
              </div>
              <Badge variant="taupe" size="sm">
                Industry: {business.industry}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Business Name"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Atelier Grooming & Hair Spa"
              />

              <Input
                label="Tagline / Specialty Slogan"
                value={profileTagline}
                onChange={(e) => setProfileTagline(e.target.value)}
                placeholder="e.g. Artisanal hair styling & scalp therapies"
              />

              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                  Public Editorial Description
                </label>
                <textarea
                  rows={3}
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  className="w-full bg-[#FAF6F0] text-[#30251E] text-xs p-3 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none resize-none leading-relaxed"
                  placeholder="Describe the atmosphere, services, and luxury standard of your boutique..."
                />
              </div>

              <Input
                label="Concierge Email Address"
                type="email"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="concierge@atelier.demo"
              />

              <Input
                label="Direct Telephone"
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="+1 (212) 555-0142"
              />

              <div className="md:col-span-2">
                <Input
                  label="Physical Studio / Suite Address"
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  placeholder="428 Mercer Street, SoHo, New York, NY 10013"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                  Operating Timezone
                </label>
                <select
                  value={profileTimezone}
                  onChange={(e) => setProfileTimezone(e.target.value)}
                  className="w-full bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                >
                  <option value="America/New_York">Eastern Time (America/New_York)</option>
                  <option value="America/Chicago">Central Time (America/Chicago)</option>
                  <option value="America/Denver">Mountain Time (America/Denver)</option>
                  <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
                  <option value="Europe/London">London (Europe/London)</option>
                  <option value="Europe/Paris">Paris (Europe/Paris)</option>
                  <option value="Asia/Tokyo">Tokyo (Asia/Tokyo)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                  Pricing Currency (ISO 4217)
                </label>
                <select
                  value={profileCurrency}
                  onChange={(e) => setProfileCurrency(e.target.value)}
                  className="w-full bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                >
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                  <option value="CAD">CAD — Canadian Dollar (CA$)</option>
                  <option value="AUD">AUD — Australian Dollar (A$)</option>
                  <option value="CHF">CHF — Swiss Franc (CHF)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-[#D8C3A5] flex items-center justify-between">
              <span className="text-[11px] text-[#80664F] flex items-center gap-1.5">
                <Info size={13} className="text-[#B58A55]" />
                <span>Business ID (<span className="font-mono">{business.id}</span>) and industry archetype are permanently isolated.</span>
              </span>
              <Button type="submit" variant="primary" size="md" leftIcon={<Save size={16} />}>
                Save Profile Changes
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: OPERATING HOURS & SPECIAL CLOSURES */}
      {/* ===================================================================== */}
      {activeTab === 'hours' && (
        <div className="space-y-8">
          {/* Section A: Weekly Operating Hours */}
          <form onSubmit={handleSaveHours}>
            <Card variant="ivory" className="p-6 space-y-6">
              <div className="border-b border-[#D8C3A5] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-editorial text-lg font-semibold text-[#30251E]">
                    Standard Weekly Operating Schedule
                  </h2>
                  <p className="text-xs text-[#594231] mt-0.5">
                    Define regular hours when your boutique is open for client appointments.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleApplyMondayToAll}
                >
                  Apply Mon Hours to Mon–Fri
                </Button>
              </div>

              <div className="divide-y divide-[#EFE5D5]">
                {DAYS_OF_WEEK.map(({ key, label }) => {
                  const dayData = hoursState[key];
                  return (
                    <div 
                      key={key} 
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="w-36 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleHourToggle(key)}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center ${
                            dayData.isOpen ? 'bg-[#465945]' : 'bg-[#D8C3A5]'
                          }`}
                          aria-label={`Toggle open status for ${label}`}
                        >
                          <div 
                            className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                              dayData.isOpen ? 'translate-x-4' : 'translate-x-0'
                            }`} 
                          />
                        </button>
                        <span className={`text-xs font-semibold ${dayData.isOpen ? 'text-[#30251E]' : 'text-[#80664F]'}`}>
                          {label}
                        </span>
                      </div>

                      {dayData.isOpen ? (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#80664F] uppercase tracking-wider font-semibold">Open:</span>
                            <select
                              value={dayData.open}
                              onChange={(e) => handleHourChange(key, 'open', e.target.value)}
                              className="bg-[#FAF6F0] text-[#30251E] text-xs px-2.5 py-1.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                            >
                              {TIME_OPTIONS.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>

                          <span className="text-[#80664F]">—</span>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#80664F] uppercase tracking-wider font-semibold">Close:</span>
                            <select
                              value={dayData.close}
                              onChange={(e) => handleHourChange(key, 'close', e.target.value)}
                              className="bg-[#FAF6F0] text-[#30251E] text-xs px-2.5 py-1.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                            >
                              {TIME_OPTIONS.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-[#80664F] italic">
                          Closed all day
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-[#D8C3A5] flex items-center justify-between">
                <span className="text-[11px] text-[#80664F]">
                  Closing time must always succeed opening time for active days.
                </span>
                <Button type="submit" variant="primary" size="md" leftIcon={<Save size={16} />}>
                  Save Weekly Schedule
                </Button>
              </div>
            </Card>
          </form>

          {/* Section B: Holidays & Special Closures */}
          <Card variant="ivory" className="p-6 space-y-6">
            <div className="border-b border-[#D8C3A5] pb-3">
              <h2 className="font-editorial text-lg font-semibold text-[#30251E]">
                Holidays & Special Closures
              </h2>
              <p className="text-xs text-[#594231] mt-0.5">
                Schedule dates when normal business hours are suspended, shortened, or closed for private functions.
              </p>
            </div>

            {/* Add Closure Form */}
            <form onSubmit={handleAddClosure} className="bg-[#FAF6F0] border border-[#D8C3A5] p-4 rounded-sm space-y-4">
              <span className="text-[11px] uppercase tracking-wider text-[#80664F] font-semibold block">
                Schedule New Special Closure / Holiday
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#4A3B31] block mb-1">
                    Closure Date (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    required
                    value={closureDate}
                    onChange={(e) => setClosureDate(e.target.value)}
                    className="w-full bg-white text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-[#4A3B31] block mb-1">
                    Holiday / Closure Reason
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual Staff Retreat, New Year's Day, Private Gala"
                    value={closureReason}
                    onChange={(e) => setClosureReason(e.target.value)}
                    className="w-full bg-white text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#30251E]">
                    <input
                      type="checkbox"
                      checked={isFullDayClosure}
                      onChange={(e) => setIsFullDayClosure(e.target.checked)}
                      className="accent-[#B58A55] rounded-xs"
                    />
                    <span className="font-medium">Full Day Closure (No Bookings)</span>
                  </label>

                  {!isFullDayClosure && (
                    <div className="flex items-center gap-2 pl-4 border-l border-[#D8C3A5]">
                      <span className="text-[11px] text-[#80664F]">Special:</span>
                      <select
                        value={specialOpen}
                        onChange={(e) => setSpecialOpen(e.target.value)}
                        className="bg-white text-xs px-2 py-1 rounded-sm border border-[#D8C3A5]"
                      >
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="text-xs text-[#80664F]">—</span>
                      <select
                        value={specialClose}
                        onChange={(e) => setSpecialClose(e.target.value)}
                        className="bg-white text-xs px-2 py-1 rounded-sm border border-[#D8C3A5]"
                      >
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <Button type="submit" variant="primary" size="sm" leftIcon={<Plus size={14} />}>
                  Add Special Closure
                </Button>
              </div>
            </form>

            {/* Existing Closures List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#30251E] block">
                Scheduled Closures ({business.specialClosures?.length || 0})
              </span>

              {business.specialClosures && business.specialClosures.length > 0 ? (
                <div className="divide-y divide-[#EFE5D5] border border-[#D8C3A5] rounded-sm bg-white overflow-hidden">
                  {business.specialClosures.map((closure) => (
                    <div 
                      key={closure.id} 
                      className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#FAF6F0] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-[#FAF6F0] border border-[#D8C3A5] flex items-center justify-center text-[#80664F] shrink-0 font-mono text-xs font-semibold">
                          <CalendarIcon size={16} className="text-[#B58A55]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-[#30251E]">
                              {closure.date}
                            </span>
                            <Badge variant={closure.isFullDay ? 'taupe' : 'sand'} size="sm">
                              {closure.isFullDay ? 'Full Day Closed' : `Special Hours: ${closure.specialHours?.open} – ${closure.specialHours?.close}`}
                            </Badge>
                          </div>
                          <p className="text-xs text-[#594231] mt-0.5">{closure.reason}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteClosure(closure.id)}
                        className="p-1.5 text-[#80664F] hover:text-[#A84234] hover:bg-[#A84234]/10 rounded-sm transition-colors"
                        title="Remove closure"
                        aria-label={`Remove closure on ${closure.date}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-[#D8C3A5] rounded-sm bg-[#FAF6F0]">
                  <p className="text-xs text-[#80664F]">
                    No holidays or special closures are currently scheduled for {business.name}.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: BOOKING POLICIES */}
      {/* ===================================================================== */}
      {activeTab === 'policies' && (
        <form onSubmit={handleSavePolicies} className="space-y-6">
          <Card variant="ivory" className="p-6 space-y-6">
            <div className="border-b border-[#D8C3A5] pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-editorial text-lg font-semibold text-[#30251E]">
                  Reservation Windows & Buffer Rules
                </h2>
                <p className="text-xs text-[#594231] mt-0.5">
                  Parameters governing advance booking constraints, cancellation terms, and reset intervals.
                </p>
              </div>
              <Badge variant="gold" size="sm">
                Phase 2E Architecture
              </Badge>
            </div>

            <div className="bg-[#FAF6F0] border border-[#D8C3A5] p-4 rounded-sm flex items-start gap-3">
              <Info size={18} className="text-[#B58A55] shrink-0 mt-0.5" />
              <div className="text-xs text-[#594231] leading-relaxed">
                <strong>Administrative Storage Verified:</strong> These policy parameters are saved to the business schema in localStorage. During <strong>Phase 3</strong>, these rules will directly govern client slot generation and cancellation deadlines in the Customer Booking Portal.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block">
                  Minimum Lead Notice (Hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="168"
                    value={leadTimeHours}
                    onChange={(e) => setLeadTimeHours(Number(e.target.value))}
                    className="w-full bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                  />
                  <span className="text-xs text-[#80664F] shrink-0 w-16">hours notice</span>
                </div>
                <p className="text-[11px] text-[#80664F]">
                  Prevents same-day walk-ins without sufficient prep time (e.g., 2h for salon, 12h for clinical diagnostics).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block">
                  Maximum Advance Reservation Window (Days)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={maxAdvanceDays}
                    onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
                    className="w-full bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                  />
                  <span className="text-xs text-[#80664F] shrink-0 w-16">days ahead</span>
                </div>
                <p className="text-[11px] text-[#80664F]">
                  How far in advance clients may book reservations (typically 30–90 days).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block">
                  Cancellation Notice Threshold (Hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="168"
                    value={cancellationNoticeHours}
                    onChange={(e) => setCancellationNoticeHours(Number(e.target.value))}
                    className="w-full bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                  />
                  <span className="text-xs text-[#80664F] shrink-0 w-16">hours prior</span>
                </div>
                <p className="text-[11px] text-[#80664F]">
                  Minimum notice required for penalty-free cancellation.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block">
                  Rescheduling Notice Threshold (Hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="168"
                    value={rescheduleNoticeHours}
                    onChange={(e) => setRescheduleNoticeHours(Number(e.target.value))}
                    className="w-full bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                  />
                  <span className="text-xs text-[#80664F] shrink-0 w-16">hours prior</span>
                </div>
                <p className="text-[11px] text-[#80664F]">
                  Minimum notice required to reschedule without administrative review.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block">
                  Booking Slot Grid Interval (Minutes)
                </label>
                <select
                  value={slotIntervalMinutes}
                  onChange={(e) => setSlotIntervalMinutes(Number(e.target.value))}
                  className="w-full bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                >
                  <option value={15}>15 Minutes (High turnover / consults)</option>
                  <option value={30}>30 Minutes (Standard salon & fitness)</option>
                  <option value={45}>45 Minutes (Clinical diagnostics)</option>
                  <option value={60}>60 Minutes (Hourly studio & advisory)</option>
                </select>
                <p className="text-[11px] text-[#80664F]">
                  Default grid cadence for availability rendering.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block">
                  Appointment Sanitization & Reset Buffer (Minutes)
                </label>
                <select
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(Number(e.target.value))}
                  className="w-full bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                >
                  <option value={0}>0 Minutes (Immediate back-to-back)</option>
                  <option value={10}>10 Minutes (Standard buffer)</option>
                  <option value={15}>15 Minutes (Sanitization & reset)</option>
                  <option value={30}>30 Minutes (Studio strike / deep clean)</option>
                </select>
                <p className="text-[11px] text-[#80664F]">
                  Automatic buffer inserted after appointments to prevent specialist fatigue or suite congestion.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#D8C3A5] flex items-center justify-end">
              <Button type="submit" variant="primary" size="md" leftIcon={<Save size={16} />}>
                Save Booking Policies
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: INDUSTRY CONFIGURATION */}
      {/* ===================================================================== */}
      {activeTab === 'industry' && (
        <form onSubmit={handleSaveIndustryConfig} className="space-y-6">
          <Card variant="ivory" className="p-6 space-y-6">
            <div className="border-b border-[#D8C3A5] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-editorial text-lg font-semibold text-[#30251E]">
                  Industry Archetype & Custom Vocabulary
                </h2>
                <p className="text-xs text-[#594231] mt-0.5">
                  Terminology and rules tailored to <strong>{business.config.badge}</strong> ({business.industry}).
                </p>
              </div>
              <Badge variant="taupe" size="md">
                Theme: <span style={{ color: business.config.themeAccent }} className="font-bold ml-1">{business.config.themeAccent}</span>
              </Badge>
            </div>

            {/* Vocabulary Customization */}
            <div className="space-y-3">
              <span className="text-[11px] uppercase tracking-wider text-[#80664F] font-semibold block">
                Editorial Terminology
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Service Singular"
                  required
                  value={termService}
                  onChange={(e) => setTermService(e.target.value)}
                  placeholder="e.g. Treatment, Consultation, Class"
                />

                <Input
                  label="Service Plural"
                  required
                  value={termServices}
                  onChange={(e) => setTermServices(e.target.value)}
                  placeholder="e.g. Treatments, Rituals, Classes"
                />

                <Input
                  label="Specialist Singular"
                  required
                  value={termSpecialist}
                  onChange={(e) => setTermSpecialist(e.target.value)}
                  placeholder="e.g. Master Stylist, Clinician, Coach"
                />

                <Input
                  label="Specialist Plural"
                  required
                  value={termSpecialists}
                  onChange={(e) => setTermSpecialists(e.target.value)}
                  placeholder="e.g. Stylists, Doctors, Consultants"
                />

                <Input
                  label="Customer Label"
                  required
                  value={termCustomer}
                  onChange={(e) => setTermCustomer(e.target.value)}
                  placeholder="e.g. Client, Patient, Guest, Member"
                />

                <Input
                  label="Booking Action CTA"
                  required
                  value={termBookingAction}
                  onChange={(e) => setTermBookingAction(e.target.value)}
                  placeholder="e.g. Reserve Chair, Book Session"
                />
              </div>
            </div>

            {/* Industry Operational Rules */}
            <div className="space-y-3 pt-3 border-t border-[#D8C3A5]">
              <span className="text-[11px] uppercase tracking-wider text-[#80664F] font-semibold block">
                Domain Scheduling Constraints
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="p-3.5 rounded-sm border border-[#D8C3A5] bg-[#FAF6F0] flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleSpecialistRequired}
                    onChange={(e) => setRuleSpecialistRequired(e.target.checked)}
                    className="accent-[#B58A55] mt-1"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#30251E] block">
                      Mandatory Specialist Selection
                    </span>
                    <p className="text-[11px] text-[#594231] mt-0.5">
                      Client must designate a specific professional to complete reservation (recommended for salon, clinic, and advisory).
                    </p>
                  </div>
                </label>

                <label className="p-3.5 rounded-sm border border-[#D8C3A5] bg-[#FAF6F0] flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleAllowGroup}
                    onChange={(e) => setRuleAllowGroup(e.target.checked)}
                    className="accent-[#B58A55] mt-1"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#30251E] block">
                      Allow Multi-Attendee / Group Bookings
                    </span>
                    <p className="text-[11px] text-[#594231] mt-0.5">
                      Permits multiple attendees to reserve the same time slot up to maximum class capacity (fitness & workshops).
                    </p>
                  </div>
                </label>

                <label className="p-3.5 rounded-sm border border-[#D8C3A5] bg-[#FAF6F0] flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleResourceRequired}
                    onChange={(e) => setRuleResourceRequired(e.target.checked)}
                    className="accent-[#B58A55] mt-1"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#30251E] block">
                      Require Dedicated Room / Studio Resource
                    </span>
                    <p className="text-[11px] text-[#594231] mt-0.5">
                      Requires physical treatment room, photo cyclorama, or training bay allocation to prevent double-booking suites.
                    </p>
                  </div>
                </label>

                <div className="p-3.5 rounded-sm border border-[#D8C3A5] bg-[#FAF6F0] flex flex-col justify-between">
                  <label className="text-xs font-semibold text-[#30251E] block mb-1">
                    Default Slot Capacity (Headcount)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={ruleDefaultCapacity}
                    onChange={(e) => setRuleDefaultCapacity(Number(e.target.value))}
                    className="w-full bg-white text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
                  />
                  <p className="text-[11px] text-[#594231] mt-1">
                    Default participant capacity for individual (1) vs group offerings.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#D8C3A5] flex items-center justify-end">
              <Button type="submit" variant="primary" size="md" leftIcon={<Save size={16} />}>
                Save Industry Configuration
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: TEAM AVAILABILITY */}
      {/* ===================================================================== */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <Card variant="ivory" className="p-6 space-y-6">
            <div className="border-b border-[#D8C3A5] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-editorial text-lg font-semibold text-[#30251E]">
                  Specialist Weekly Working Schedules
                </h2>
                <p className="text-xs text-[#594231] mt-0.5">
                  Configure custom working hours, daily breaks, and scheduled time-off for individual professionals.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('/admin/team')}
              >
                Go to Full Team Directory
              </Button>
            </div>

            <div className="divide-y divide-[#EFE5D5]">
              {staff.map((member) => {
                const schedule = member.schedule;
                const workingStart = schedule?.start || business.hours.monday?.open || '09:00';
                const workingEnd = schedule?.end || business.hours.monday?.close || '18:00';
                const breaksCount = schedule?.breaks?.length || 0;
                const timeOffCount = schedule?.unavailableDates?.length || 0;

                return (
                  <div key={member.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-editorial text-base font-semibold text-[#30251E]">
                          {member.name}
                        </span>
                        <Badge variant={member.active ? 'taupe' : 'sand'} size="sm">
                          {member.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-xs text-[#80664F]">{member.title}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#594231]">
                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-[#B58A55]" />
                          <span>Hours: <strong>{workingStart} – {workingEnd}</strong></span>
                        </span>

                        <span>•</span>

                        <span>
                          Breaks: {breaksCount > 0 ? (
                            <strong>{schedule?.breaks?.map(b => `${b.start}–${b.end}`).join(', ')}</strong>
                          ) : (
                            <span className="text-[#80664F] italic">No daily breaks</span>
                          )}
                        </span>

                        <span>•</span>

                        <span>
                          Time-off: {timeOffCount > 0 ? (
                            <strong className="text-[#A84234]">{timeOffCount} date(s) registered</strong>
                          ) : (
                            <span className="text-[#80664F] italic">None</span>
                          )}
                        </span>
                      </div>

                      {/* Working Days Badges */}
                      <div className="flex items-center gap-1 pt-1">
                        {[
                          { idx: 1, label: 'M' },
                          { idx: 2, label: 'T' },
                          { idx: 3, label: 'W' },
                          { idx: 4, label: 'T' },
                          { idx: 5, label: 'F' },
                          { idx: 6, label: 'S' },
                          { idx: 0, label: 'S' },
                        ].map((d, i) => {
                          const isAvailable = member.availableDays?.includes(d.idx);
                          return (
                            <span
                              key={i}
                              className={`w-5 h-5 rounded-xs text-[10px] flex items-center justify-center font-semibold font-mono ${
                                isAvailable
                                  ? 'bg-[#B58A55] text-white'
                                  : 'bg-[#EFE5D5] text-[#80664F]/50'
                              }`}
                              title={isAvailable ? 'Working' : 'Off'}
                            >
                              {d.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingStaffMember(member)}
                        leftIcon={<Edit2 size={13} />}
                      >
                        Configure Schedule
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: RESOURCES & CAPACITY */}
      {/* ===================================================================== */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          {/* Metrics summary */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="ivory" className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[#80664F] font-semibold">
                Total Resources
              </span>
              <p className="font-editorial text-3xl font-semibold text-[#30251E]">
                {resources.length}
              </p>
              <p className="text-xs text-[#594231]">
                Physical rooms, studios, or bays
              </p>
            </Card>

            <Card variant="ivory" className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[#80664F] font-semibold">
                Active Bookable Units
              </span>
              <p className="font-editorial text-3xl font-semibold text-[#30251E]">
                {activeResourcesCount}
              </p>
              <p className="text-xs text-[#594231]">
                Available for reservation
              </p>
            </Card>

            <Card variant="ivory" className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[#80664F] font-semibold">
                Aggregate Room Capacity
              </span>
              <p className="font-editorial text-3xl font-semibold text-[#30251E]">
                {totalCapacityCount} <span className="text-sm font-sans font-normal text-[#80664F]">people</span>
              </p>
              <p className="text-xs text-[#594231]">
                Concurrent capacity across suites
              </p>
            </Card>
          </section>

          <Card variant="ivory" className="p-6 space-y-6">
            <div className="border-b border-[#D8C3A5] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-editorial text-lg font-semibold text-[#30251E]">
                  Resource Directory & Room Units
                </h2>
                <p className="text-xs text-[#594231] mt-0.5">
                  Treatment suites, training bays, and photo stages utilized during booking conflict verification.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddResourceOpen(true)}
                leftIcon={<Plus size={14} />}
              >
                Add Resource
              </Button>
            </div>

            {resources.length > 0 ? (
              <div className="divide-y divide-[#EFE5D5]">
                {resources.map((res) => (
                  <div key={res.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-editorial text-base font-semibold text-[#30251E]">
                          {res.name}
                        </span>
                        <Badge variant="taupe" size="sm">
                          {res.type}
                        </Badge>
                        <Badge variant={res.active ? 'sand' : 'taupe'} size="sm">
                          {res.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <p className="text-xs text-[#594231] max-w-xl">
                        {res.description || 'No equipment or suite notes provided.'}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-[#80664F] pt-0.5">
                        <span>Max Simultaneous Capacity: <strong>{res.capacity} person(s)</strong></span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">ID: {res.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingResource(res)}
                        leftIcon={<Edit2 size={13} />}
                      >
                        Edit
                      </Button>

                      <Button
                        variant={res.active ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => {
                          const success = toggleResourceActive(res.id, business.id);
                          if (success) {
                            showFeedback('success', `Resource "${res.name}" status updated.`);
                          } else {
                            showFeedback('error', 'Failed to update resource status.');
                          }
                        }}
                      >
                        {res.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-[#D8C3A5] rounded-sm bg-[#FAF6F0] space-y-3">
                <Layers size={28} className="mx-auto text-[#B58A55]" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#30251E]">
                    No Physical Resources Configured
                  </p>
                  <p className="text-xs text-[#80664F] max-w-md mx-auto">
                    {business.name} does not have registered treatment suites or equipment rooms yet. Add suites to enforce space conflict checking.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddResourceOpen(true)}
                  leftIcon={<Plus size={14} />}
                >
                  Create First Resource
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: Configure Staff Member Schedule */}
      {/* ===================================================================== */}
      {editingStaffMember && (
        <StaffScheduleModal
          business={business}
          staff={editingStaffMember}
          onClose={() => setEditingStaffMember(null)}
          onSuccess={() => {
            setEditingStaffMember(null);
            showFeedback('success', `Schedule updated for ${editingStaffMember.name}.`);
          }}
        />
      )}

      {/* ===================================================================== */}
      {/* MODAL: Add Resource */}
      {/* ===================================================================== */}
      {isAddResourceOpen && (
        <ResourceModal
          businessId={business.id}
          onClose={() => setIsAddResourceOpen(false)}
          onSuccess={(res) => {
            setIsAddResourceOpen(false);
            showFeedback('success', `Resource "${res.name}" created successfully.`);
          }}
        />
      )}

      {/* ===================================================================== */}
      {/* MODAL: Edit Resource */}
      {/* ===================================================================== */}
      {editingResource && (
        <ResourceModal
          businessId={business.id}
          initialResource={editingResource}
          onClose={() => setEditingResource(null)}
          onSuccess={(res) => {
            setEditingResource(null);
            showFeedback('success', `Resource "${res.name}" updated successfully.`);
          }}
        />
      )}
    </div>
  );
};

// ===========================================================================
// SUB-COMPONENT: Staff Schedule Modal
// ===========================================================================

interface StaffScheduleModalProps {
  business: Business;
  staff: Staff;
  onClose: () => void;
  onSuccess: () => void;
}

const StaffScheduleModal: React.FC<StaffScheduleModalProps> = ({
  business,
  staff,
  onClose,
  onSuccess,
}) => {
  const currentSchedule = staff.schedule;
  const [workingStart, setWorkingStart] = useState(currentSchedule?.start || business.hours.monday?.open || '09:00');
  const [workingEnd, setWorkingEnd] = useState(currentSchedule?.end || business.hours.monday?.close || '18:00');
  const [availableDays, setAvailableDays] = useState<number[]>(staff.availableDays || [1, 2, 3, 4, 5]);

  // Daily Break
  const initialBreak = currentSchedule?.breaks?.[0];
  const [hasBreak, setHasBreak] = useState(Boolean(initialBreak));
  const [breakStart, setBreakStart] = useState(initialBreak?.start || '13:00');
  const [breakEnd, setBreakEnd] = useState(initialBreak?.end || '14:00');

  // Time-off dates
  const [unavailableDates, setUnavailableDates] = useState<string[]>(currentSchedule?.unavailableDates || []);
  const [newDateOff, setNewDateOff] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (dayIndex: number) => {
    setAvailableDays(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleAddDateOff = () => {
    if (!newDateOff) return;
    if (unavailableDates.includes(newDateOff)) {
      setError(`Date ${newDateOff} is already recorded as time-off.`);
      return;
    }
    setUnavailableDates(prev => [...prev, newDateOff].sort());
    setNewDateOff('');
    setError(null);
  };

  const handleRemoveDateOff = (dateToRemove: string) => {
    setUnavailableDates(prev => prev.filter(d => d !== dateToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validate working hours
    if (workingStart >= workingEnd) {
      setError(`Working end time (${workingEnd}) must be later than start time (${workingStart}).`);
      return;
    }

    // 2. Validate breaks
    if (hasBreak) {
      if (breakStart >= breakEnd) {
        setError('Break end time must be later than break start time.');
        return;
      }
      if (breakStart < workingStart || breakEnd > workingEnd) {
        setError(`Break interval (${breakStart} – ${breakEnd}) must fall within working hours (${workingStart} – ${workingEnd}).`);
        return;
      }
    }

    const updatedSchedule: StaffSchedule = {
      start: workingStart,
      end: workingEnd,
      breaks: hasBreak ? [{ start: breakStart, end: breakEnd }] : [],
      unavailableDates,
    };

    const success = updateStaffSchedule(staff.id, updatedSchedule, availableDays);
    if (!success) {
      setError('Failed to persist schedule changes.');
      return;
    }

    onSuccess();
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
              INDIVIDUAL SPECIALIST SCHEDULE
            </span>
            <h3 className="font-editorial text-xl font-semibold text-[#30251E]">
              {staff.name}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#EFE5D5] rounded-sm text-[#80664F]">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-[#FBEBE8] border border-[#DDA399] rounded-sm text-xs text-[#7A291D] flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Working Weekdays */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-2">
              Working Weekdays
            </label>
            <div className="grid grid-cols-7 gap-1">
              {[
                { idx: 1, label: 'Mon' },
                { idx: 2, label: 'Tue' },
                { idx: 3, label: 'Wed' },
                { idx: 4, label: 'Thu' },
                { idx: 5, label: 'Fri' },
                { idx: 6, label: 'Sat' },
                { idx: 0, label: 'Sun' },
              ].map(({ idx, label }) => {
                const active = availableDays.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`py-2 text-xs font-semibold rounded-sm border transition-colors ${
                      active
                        ? 'bg-[#30251E] text-white border-[#30251E]'
                        : 'bg-white text-[#80664F] border-[#D8C3A5] hover:border-[#B58A55]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Working Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#4A3B31] block mb-1">
                Shift Start Time
              </label>
              <select
                value={workingStart}
                onChange={(e) => setWorkingStart(e.target.value)}
                className="w-full bg-white text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              >
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#4A3B31] block mb-1">
                Shift End Time
              </label>
              <select
                value={workingEnd}
                onChange={(e) => setWorkingEnd(e.target.value)}
                className="w-full bg-white text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              >
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Daily Break Configuration */}
          <div className="p-3.5 bg-white border border-[#D8C3A5] rounded-sm space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#30251E]">
              <input
                type="checkbox"
                checked={hasBreak}
                onChange={(e) => setHasBreak(e.target.checked)}
                className="accent-[#B58A55]"
              />
              <span>Schedule Daily Mid-Day Break / Lunch</span>
            </label>

            {hasBreak && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block mb-1">
                    Break Start
                  </span>
                  <select
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    className="w-full bg-[#FAF6F0] text-xs px-2.5 py-1.5 rounded-sm border border-[#D8C3A5]"
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block mb-1">
                    Break End
                  </span>
                  <select
                    value={breakEnd}
                    onChange={(e) => setBreakEnd(e.target.value)}
                    className="w-full bg-[#FAF6F0] text-xs px-2.5 py-1.5 rounded-sm border border-[#D8C3A5]"
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Unavailable / Vacation Dates */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block">
              Time-off & Vacation Dates
            </label>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={newDateOff}
                onChange={(e) => setNewDateOff(e.target.value)}
                className="bg-white text-xs px-3 py-1.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddDateOff}>
                Add Date
              </Button>
            </div>

            {unavailableDates.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {unavailableDates.map((d) => (
                  <span 
                    key={d} 
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-[#D8C3A5] rounded-sm text-xs font-mono text-[#30251E]"
                  >
                    <span>{d}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDateOff(d)}
                      className="text-[#80664F] hover:text-[#A84234]"
                      aria-label={`Remove time off date ${d}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#80664F] italic">
                No time-off dates currently recorded.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-[#D8C3A5] flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              Save Schedule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===========================================================================
// SUB-COMPONENT: Resource Modal (Create / Edit)
// ===========================================================================

interface ResourceModalProps {
  businessId: string;
  initialResource?: Resource;
  onClose: () => void;
  onSuccess: (res: Resource) => void;
}

const ResourceModal: React.FC<ResourceModalProps> = ({
  businessId,
  initialResource,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(initialResource?.name || '');
  const [type, setType] = useState<Resource['type']>(initialResource?.type || 'room');
  const [capacity, setCapacity] = useState(initialResource?.capacity || 1);
  const [description, setDescription] = useState(initialResource?.description || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Resource name is required.');
      return;
    }
    if (capacity < 1) {
      setError('Capacity must be at least 1 person.');
      return;
    }

    if (initialResource) {
      const updated: Resource = {
        ...initialResource,
        name: name.trim(),
        type,
        capacity: Number(capacity),
        description: description.trim() || undefined,
      };
      const success = updateResource(updated);
      if (!success) {
        setError('Failed to update resource.');
        return;
      }
      onSuccess(updated);
    } else {
      const created = createResource({
        businessId,
        name: name.trim(),
        type,
        capacity: Number(capacity),
        description: description.trim() || undefined,
        active: true,
      });
      onSuccess(created);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF6F0] border border-[#D8C3A5] rounded-sm max-w-md w-full p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D8C3A5] pb-3">
          <h3 className="font-editorial text-lg font-semibold text-[#30251E]">
            {initialResource ? 'Edit Resource' : 'Add Physical Resource'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-[#EFE5D5] rounded-sm text-[#80664F]">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-[#FBEBE8] border border-[#DDA399] rounded-sm text-xs text-[#7A291D] flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Resource Name"
            required
            placeholder="e.g. Treatment Suite B, Corner Cyclorama"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                Resource Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Resource['type'])}
                className="w-full bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              >
                <option value="room">Room / Suite</option>
                <option value="studio">Studio Stage</option>
                <option value="equipment">Specialized Equipment</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                Max Capacity
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
              Description & Specifications
            </label>
            <textarea
              rows={2}
              placeholder="Soundproofing rating, power outlets, specialty fixtures..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#FAF6F0] text-[#30251E] text-xs p-3 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none resize-none"
            />
          </div>

          <div className="pt-3 border-t border-[#D8C3A5] flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              {initialResource ? 'Save Resource' : 'Create Resource'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
