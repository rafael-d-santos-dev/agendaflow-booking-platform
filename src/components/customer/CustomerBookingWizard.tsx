/**
 * AgendaFlow — Customer Booking Wizard (Steps 1–4)
 * Product Specification v1.0 | Phase 3.2
 * Editorial Luxury booking concierge: Service Selection, Specialist/Space Selection,
 * Date Selection, and Time Slot Selection with dynamic availability engine integration.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  Users, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  Layers, 
  ArrowRight, 
  RotateCcw, 
  Info, 
  AlertCircle,
  Tag,
  CheckCircle2,
  Copy,
  Mail,
  Phone,
  FileText
} from 'lucide-react';
import { 
  Business, 
  Service, 
  Staff, 
  Resource, 
  StorageSchema,
  Appointment,
  Customer
} from '../../types/index.ts';
import { Card } from '../common/Card.tsx';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { formatCurrency, formatDuration, formatEditorialDate } from '../../utils/formatters.ts';
import { 
  getAvailableBookingDates, 
  generateAvailableSlots, 
  getEligibleStaffForService, 
  getEligibleResourcesForBusiness,
  getNowInBusinessTimezone,
  SlotOption,
  AvailableDateOption
} from '../../utils/availability.ts';
import { getServicesForBusiness, bookCustomerAppointment } from '../../utils/storage.ts';

export interface BookingDraftState {
  businessId: string;
  serviceId: string | null;
  selectedStaffId: string | null;     // specific staff ID, 'any', or null
  assignedStaffId: string | null;     // actual staff ID resolved by engine from selected slot
  selectedResourceId: string | null;  // resolved resource ID from selected slot
  selectedDate: string | null;        // YYYY-MM-DD
  selectedTime: string | null;        // HH:MM
  requestedAttendees: number;         // validated positive integer (default 1)
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

interface CustomerBookingWizardProps {
  business: Business;
  storageState: StorageSchema;
  onNavigateAdmin: () => void;
}

export const CustomerBookingWizard: React.FC<CustomerBookingWizardProps> = ({
  business,
  storageState,
  onNavigateAdmin,
}) => {
  // Wizard State with strict downstream invalidation
  const [draft, setDraft] = useState<BookingDraftState>({
    businessId: business.id,
    serviceId: null,
    selectedStaffId: null,
    assignedStaffId: null,
    selectedResourceId: null,
    selectedDate: null,
    selectedTime: null,
    requestedAttendees: 1,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerNotes: '',
    step: 1,
  });

  // Category filter state for Step 1
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Month offset for calendar in Step 3 (0 = current month in business timezone)
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);

  // Form validation errors for Step 5
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Submission lifecycle states for Step 6 & 7
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [confirmedCustomer, setConfirmedCustomer] = useState<Customer | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Reset draft if business changes
  useEffect(() => {
    setDraft({
      businessId: business.id,
      serviceId: null,
      selectedStaffId: null,
      assignedStaffId: null,
      selectedResourceId: null,
      selectedDate: null,
      selectedTime: null,
      requestedAttendees: 1,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerNotes: '',
      step: 1,
    });
    setSelectedCategory('all');
    setCalendarMonthOffset(0);
    setFormErrors({});
    setIsSubmitting(false);
    setSubmissionError(null);
    setConfirmedAppointment(null);
    setConfirmedCustomer(null);
    setCopiedCode(false);
  }, [business.id]);

  // Active services for this business
  const activeServices = useMemo(() => {
    return getServicesForBusiness(business.id, false, storageState);
  }, [business.id, storageState]);

  // Unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeServices.forEach(s => {
      if (s.category?.trim()) set.add(s.category.trim());
    });
    return Array.from(set).sort();
  }, [activeServices]);

  // Currently selected service entity
  const selectedService = useMemo(() => {
    if (!draft.serviceId) return null;
    return activeServices.find(s => s.id === draft.serviceId) || null;
  }, [draft.serviceId, activeServices]);

  // Eligible staff for selected service
  const eligibleStaff = useMemo(() => {
    if (!draft.serviceId) return [];
    return getEligibleStaffForService(draft.serviceId, business.id, storageState);
  }, [draft.serviceId, business.id, storageState]);

  // Eligible resources for business
  const eligibleResources = useMemo(() => {
    return getEligibleResourcesForBusiness(business.id, selectedService || undefined, storageState);
  }, [business.id, selectedService, storageState]);

  // Available booking dates
  const availableDates = useMemo(() => {
    return getAvailableBookingDates(business);
  }, [business]);

  // Generated slots for Step 4
  const availableSlots = useMemo(() => {
    if (!selectedService || !draft.selectedDate) return [];
    return generateAvailableSlots(
      business,
      selectedService,
      draft.selectedDate,
      draft.selectedStaffId || undefined,
      draft.selectedResourceId || undefined,
      draft.requestedAttendees,
      storageState
    );
  }, [
    business, 
    selectedService, 
    draft.selectedDate, 
    draft.selectedStaffId, 
    draft.selectedResourceId, 
    draft.requestedAttendees, 
    storageState
  ]);

  // Resolved entities for review/summary
  const resolvedSpecialist = useMemo(() => {
    const staffId = draft.assignedStaffId || (draft.selectedStaffId !== 'any' ? draft.selectedStaffId : null);
    if (!staffId) return null;
    return storageState.staff.find(s => s.id === staffId) || null;
  }, [draft.assignedStaffId, draft.selectedStaffId, storageState.staff]);

  const resolvedResource = useMemo(() => {
    if (!draft.selectedResourceId) return null;
    return storageState.resources.find(r => r.id === draft.selectedResourceId) || null;
  }, [draft.selectedResourceId, storageState.resources]);

  // Selected slot entity
  const selectedSlotEntity = useMemo(() => {
    if (!draft.selectedTime) return null;
    return availableSlots.find(s => s.timeSlot === draft.selectedTime) || null;
  }, [draft.selectedTime, availableSlots]);

  // -------------------------------------------------------------------------
  // Handlers with downstream invalidation
  // -------------------------------------------------------------------------

  const handleSelectService = (service: Service) => {
    setDraft(prev => ({
      ...prev,
      serviceId: service.id,
      selectedStaffId: null,
      assignedStaffId: null,
      selectedResourceId: null,
      selectedDate: null,
      selectedTime: null,
      requestedAttendees: 1,
      // Step 2 if specialist required or business uses specialists, otherwise Step 3
      step: (business.config.rules.requiresSpecialistSelection || service.requiresResource) ? 2 : 3,
    }));
    setSubmissionError(null);
  };

  const handleSelectStaff = (staffId: string) => {
    setDraft(prev => ({
      ...prev,
      selectedStaffId: staffId,
      assignedStaffId: null, // will be resolved when a slot is chosen
      selectedDate: null,
      selectedTime: null,
      step: 3,
    }));
    setSubmissionError(null);
  };

  const handleSelectResource = (resourceId: string) => {
    setDraft(prev => ({
      ...prev,
      selectedResourceId: resourceId,
      selectedDate: null,
      selectedTime: null,
      step: 3,
    }));
    setSubmissionError(null);
  };

  const handleSelectDate = (dateStr: string) => {
    setDraft(prev => ({
      ...prev,
      selectedDate: dateStr,
      selectedTime: null,
      assignedStaffId: null,
      step: 4,
    }));
    setSubmissionError(null);
  };

  const handleSelectSlot = (slot: SlotOption) => {
    // Audit Condition C: preserve actual assignedStaffId from slot, NEVER 'any'
    setDraft(prev => ({
      ...prev,
      selectedTime: slot.timeSlot,
      assignedStaffId: slot.assignedStaffId || prev.assignedStaffId,
      selectedResourceId: slot.assignedResourceId || prev.selectedResourceId,
    }));
    setSubmissionError(null);
  };

  const handleAttendeesChange = (count: number) => {
    // Audit Condition B: strictly positive integer validation
    const sanitized = Math.max(1, Math.floor(count || 1));
    const maxAllowed = selectedService?.maxCapacity || 1;
    const finalCount = Math.min(sanitized, maxAllowed);
    setDraft(prev => ({
      ...prev,
      requestedAttendees: finalCount,
      selectedTime: null, // invalidate time because capacity changes available slots
    }));
    setSubmissionError(null);
  };

  const handleJumpToStep = (targetStep: 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
    // Cannot navigate away from step 7 via stepper (booking is already completed)
    if (draft.step === 7) return;

    // Only allow jumping back to a previously reached step
    if (targetStep < draft.step) {
      setDraft(prev => ({ ...prev, step: targetStep }));
      setSubmissionError(null);
    }
  };

  // Step 5 Validation & Progression to Step 6
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    const name = draft.customerName.trim();
    const email = draft.customerEmail.trim();
    const phone = draft.customerPhone.trim();
    const digitsOnly = phone.replace(/\D/g, '');

    if (!name) {
      errors.name = 'Full name is required.';
    } else if (name.length < 2) {
      errors.name = 'Please provide a valid full name.';
    }

    if (!email) {
      errors.email = 'Email address is required for confirmation.';
    } else if (!email.includes('@') || !email.includes('.')) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!phone) {
      errors.phone = 'Phone number is required.';
    } else if (digitsOnly.length < 7) {
      errors.phone = 'Phone number must contain at least 7 digits.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmissionError(null);
    setDraft(prev => ({ ...prev, step: 6 }));
  };

  // Step 6 Final Reservation Execution
  const handleConfirmReservation = () => {
    if (!selectedService || !draft.selectedDate || !draft.selectedTime) {
      setSubmissionError('Incomplete booking details. Please review your selection.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    // Synchronous execution against storage engine with pre-persistence revalidation
    try {
      const resolvedStaff = draft.assignedStaffId || (draft.selectedStaffId !== 'any' ? draft.selectedStaffId : undefined);
      const finalStaffId: string | undefined = resolvedStaff || undefined;

      const result = bookCustomerAppointment({
        businessId: business.id,
        serviceId: selectedService.id,
        staffId: finalStaffId,
        resourceId: draft.selectedResourceId || undefined,
        date: draft.selectedDate,
        timeSlot: draft.selectedTime,
        attendeesCount: draft.requestedAttendees,
        customerName: draft.customerName,
        customerEmail: draft.customerEmail,
        customerPhone: draft.customerPhone,
        customerNotes: draft.customerNotes,
      });

      if (!result.success) {
        setIsSubmitting(false);
        setSubmissionError(result.error || 'The requested appointment could not be reserved. Please select another slot.');
        return;
      }

      // Success: advance to confirmation screen with receipt
      setConfirmedAppointment(result.appointment || null);
      setConfirmedCustomer(result.customer || null);
      setDraft(prev => ({ ...prev, step: 7 }));
      setIsSubmitting(false);
    } catch (err) {
      console.error('[AgendaFlow Booking] Unexpected error:', err);
      setIsSubmitting(false);
      setSubmissionError('An unexpected system error occurred while recording your booking. Please try again.');
    }
  };

  // Reset entire booking wizard for a new reservation
  const handleBookAnother = () => {
    setDraft({
      businessId: business.id,
      serviceId: null,
      selectedStaffId: null,
      assignedStaffId: null,
      selectedResourceId: null,
      selectedDate: null,
      selectedTime: null,
      requestedAttendees: 1,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerNotes: '',
      step: 1,
    });
    setFormErrors({});
    setIsSubmitting(false);
    setSubmissionError(null);
    setConfirmedAppointment(null);
    setConfirmedCustomer(null);
    setCopiedCode(false);
  };

  // Copy confirmation code to clipboard
  const handleCopyCode = () => {
    if (!confirmedAppointment?.confirmationCode) return;
    navigator.clipboard?.writeText(confirmedAppointment.confirmationCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }).catch(() => {
      // Fallback
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  // Grouping slots into Morning, Afternoon, Evening
  const groupedSlots = useMemo(() => {
    const morning: SlotOption[] = [];
    const afternoon: SlotOption[] = [];
    const evening: SlotOption[] = [];

    availableSlots.forEach(slot => {
      const hour = Number(slot.timeSlot.split(':')[0]);
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 17) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  }, [availableSlots]);

  // Current business timezone metadata
  const businessNow = useMemo(() => {
    return getNowInBusinessTimezone(business.timezone);
  }, [business.timezone]);

  return (
    <div className="space-y-8">
      {/* Editorial Boutique Hero Section */}
      <section className="text-center max-w-2xl mx-auto space-y-3">
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[#80664F] font-semibold bg-[#D8C3A5]/25 px-2.5 py-0.5 rounded-xs border border-[#D8C3A5]">
            {business.config.badge} Concierge
          </span>
          <span className="text-xs text-[#80664F]">•</span>
          <span className="text-xs text-[#80664F] font-medium">
            {business.timezone.replace('_', ' ')}
          </span>
        </div>

        <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#30251E]">
          {business.config.terminology.bookingAction}
        </h1>
        <p className="text-xs sm:text-sm text-[#594231] font-sans leading-relaxed">
          {business.description}
        </p>
      </section>

      {/* Developer / Reviewer Return to Admin Notice */}
      <div className="bg-[#FAF6F0] border border-[#D8C3A5] p-4 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#B58A55]/15 flex items-center justify-center text-[#966F3D] shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#30251E]">
              Boutique Reservation Portal — {business.name}
            </p>
            <p className="text-[11px] text-[#594231]">
              Phase 3.3: Complete 7-step booking concierge with live revalidation & confirmation receipt.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateAdmin}
        >
          Return to Admin
        </Button>
      </div>

      {/* Seven-Step Editorial Progress Stepper */}
      <nav 
        aria-label="Booking Progress" 
        className="border-y border-[#D8C3A5] bg-[#FAF6F0] py-3 px-2 sm:px-4"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto scrollbar-none text-xs">
          {[
            { num: 1, label: business.config.terminology.service, active: draft.step === 1, done: draft.step > 1 },
            { num: 2, label: business.config.rules.requiresSpecialistSelection ? business.config.terminology.specialist : 'Space / Bay', active: draft.step === 2, done: draft.step > 2 },
            { num: 3, label: 'Date', active: draft.step === 3, done: draft.step > 3 },
            { num: 4, label: 'Time', active: draft.step === 4, done: draft.step > 4 },
            { num: 5, label: 'Guest Details', active: draft.step === 5, done: draft.step > 5 },
            { num: 6, label: 'Review', active: draft.step === 6, done: draft.step > 6 },
            { num: 7, label: 'Confirmation', active: draft.step === 7, done: draft.step === 7 },
          ].map((st) => (
            <div key={st.num} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                disabled={draft.step === 7 || st.num > draft.step}
                onClick={() => handleJumpToStep(st.num as any)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs transition-colors ${
                  st.active
                    ? 'bg-[#30251E] text-white font-semibold'
                    : st.done
                    ? 'text-[#30251E] font-medium hover:bg-[#EFE5D5] cursor-pointer'
                    : 'text-[#80664F]/60 cursor-not-allowed'
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center font-bold ${
                  st.active
                    ? 'bg-[#B58A55] text-white'
                    : st.done
                    ? 'bg-[#465945] text-white'
                    : 'bg-[#D8C3A5]/50 text-[#80664F]'
                }`}>
                  {st.done ? '✓' : st.num}
                </span>
                <span className="truncate max-w-[95px] sm:max-w-none">{st.label}</span>
              </button>

              {st.num < 7 && (
                <span className="text-[#D8C3A5] font-light">/</span>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* ===================================================================== */}
      {/* STEP 1: SERVICE SELECTION */}
      {/* ===================================================================== */}
      {draft.step === 1 && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#D8C3A5] pb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                Step 1 of 7
              </span>
              <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
                Select a {business.config.terminology.service}
              </h2>
            </div>
            <span className="text-xs text-[#80664F]">
              {activeServices.length} offerings curated
            </span>
          </div>

          {/* Category Filter */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#30251E] text-white border-[#30251E] font-medium'
                    : 'bg-[#FAF6F0] text-[#594231] border-[#D8C3A5] hover:border-[#B58A55]'
                }`}
              >
                All Curations ({activeServices.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs rounded-sm border transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-[#30251E] text-white border-[#30251E] font-medium'
                      : 'bg-[#FAF6F0] text-[#594231] border-[#D8C3A5] hover:border-[#B58A55]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeServices
              .filter(s => selectedCategory === 'all' || s.category === selectedCategory)
              .map((service) => (
                <Card
                  key={service.id}
                  variant="ivory"
                  className="flex flex-col justify-between hover:border-[#B58A55] transition-all p-5 shadow-xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold">
                        {service.category}
                      </span>
                      <span className="font-editorial text-xl font-semibold text-[#30251E]">
                        {formatCurrency(service.price, business.currency)}
                      </span>
                    </div>

                    <h3 className="font-editorial text-xl font-medium text-[#30251E]">
                      {service.name}
                    </h3>

                    <p className="text-xs text-[#594231] leading-relaxed">
                      {service.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {service.maxCapacity > 1 ? (
                        <Badge variant="sand" size="sm">
                          Group Class • Up to {service.maxCapacity} participants
                        </Badge>
                      ) : (
                        <Badge variant="taupe" size="sm">
                          Private 1-on-1 Session
                        </Badge>
                      )}

                      {service.requiresResource && (
                        <Badge variant="taupe" size="sm">
                          Dedicated Suite/Stage
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#D8C3A5]/60 flex items-center justify-between">
                    <span className="text-xs text-[#80664F] inline-flex items-center gap-1.5 font-medium">
                      <Clock size={13} className="text-[#B58A55]" />
                      <span>{formatDuration(service.durationMinutes)}</span>
                    </span>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSelectService(service)}
                      rightIcon={<ArrowRight size={13} />}
                    >
                      Select {business.config.terminology.service}
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: PROFESSIONAL / RESOURCE SELECTION */}
      {/* ===================================================================== */}
      {draft.step === 2 && selectedService && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#D8C3A5] pb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                Step 2 of 7
              </span>
              <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
                {business.config.rules.requiresSpecialistSelection 
                  ? `Choose Your ${business.config.terminology.specialist}` 
                  : 'Select Studio Stage or Booking Space'}
              </h2>
              <p className="text-xs text-[#594231] mt-0.5">
                Curating appointment for: <strong>{selectedService.name}</strong> ({formatDuration(selectedService.durationMinutes)})
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDraft(prev => ({ ...prev, step: 1 }))}
              leftIcon={<ChevronLeft size={14} />}
            >
              Change {business.config.terminology.service}
            </Button>
          </div>

          {/* Group Class Attendee Selector (if applicable) */}
          {selectedService.maxCapacity > 1 && (
            <Card variant="sand" className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[#30251E] flex items-center gap-1.5">
                  <Users size={14} className="text-[#B58A55]" />
                  <span>Number of Participants Enrolling</span>
                </span>
                <p className="text-[11px] text-[#594231]">
                  Reserve multiple spots for your party in this class session (max {selectedService.maxCapacity} spots).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#80664F]">Seats:</label>
                <select
                  value={draft.requestedAttendees}
                  onChange={(e) => handleAttendeesChange(Number(e.target.value))}
                  className="bg-white text-xs px-3 py-1.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] font-semibold text-[#30251E] outline-none"
                >
                  {Array.from({ length: selectedService.maxCapacity }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'Participant' : 'Participants'}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          )}

          {/* CASE A: Specialist Selection (Salon, Clinic, Advisory, Fitness) */}
          {(business.config.rules.requiresSpecialistSelection || eligibleStaff.length > 0) && (
            <div className="space-y-4">
              {/* "Any Available Specialist" Option */}
              <Card
                variant="ivory"
                className="p-5 border-2 hover:border-[#B58A55] cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF6F0]"
                onClick={() => handleSelectStaff('any')}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#B58A55]/20 flex items-center justify-center text-[#966F3D] shrink-0 border border-[#B58A55]/30">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-editorial text-lg font-semibold text-[#30251E]">
                        Any Available {business.config.terminology.specialist}
                      </h3>
                      <Badge variant="gold" size="sm">
                        Fastest Availability
                      </Badge>
                    </div>
                    <p className="text-xs text-[#594231] mt-0.5 max-w-xl">
                      Maximum scheduling flexibility — automatically assigned to the first qualified professional for your desired time.
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSelectStaff('any')}
                  rightIcon={<ArrowRight size={13} />}
                >
                  Choose First Available
                </Button>
              </Card>

              {/* Individual Specialists Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eligibleStaff.map((member) => (
                  <Card
                    key={member.id}
                    variant="ivory"
                    className="p-5 flex flex-col justify-between hover:border-[#B58A55] transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-editorial text-lg font-semibold text-[#30251E]">
                            {member.name}
                          </h4>
                          <p className="text-xs text-[#80664F] font-medium">{member.title}</p>
                        </div>
                        <Badge variant="taupe" size="sm">
                          Verified
                        </Badge>
                      </div>

                      <p className="text-xs text-[#594231] leading-relaxed">
                        {member.bio}
                      </p>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {member.specialties.map(spec => (
                          <span 
                            key={spec}
                            className="text-[10px] px-2 py-0.5 rounded-xs bg-[#EFE5D5] text-[#594231] border border-[#D8C3A5]"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-[#D8C3A5]/60 flex items-center justify-between">
                      <span className="text-[11px] text-[#80664F] font-mono">
                        ID: {member.id}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSelectStaff(member.id)}
                        rightIcon={<ArrowRight size={13} />}
                      >
                        Select Specialist
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {eligibleStaff.length === 0 && (
                <div className="p-8 text-center border border-dashed border-[#D8C3A5] rounded-sm bg-[#FAF6F0] space-y-2">
                  <AlertCircle size={24} className="mx-auto text-[#B58A55]" />
                  <p className="text-xs text-[#80664F]">
                    No specialists are currently assigned to this service. Please contact boutique concierge for assistance.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CASE B: Space / Stage Selection (Monolith Studios or Spaces) */}
          {!business.config.rules.requiresSpecialistSelection && eligibleResources.length > 0 && (
            <div className="space-y-4">
              <span className="text-xs text-[#80664F] font-medium block">
                Available Studio Stages & Facilities ({eligibleResources.length})
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eligibleResources.map((res) => (
                  <Card
                    key={res.id}
                    variant="ivory"
                    className="p-5 flex flex-col justify-between hover:border-[#B58A55] transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-editorial text-lg font-semibold text-[#30251E]">
                            {res.name}
                          </h4>
                          <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold">
                            Category: {res.type}
                          </span>
                        </div>
                        <Badge variant="taupe" size="sm">
                          Cap: {res.capacity} crew
                        </Badge>
                      </div>

                      <p className="text-xs text-[#594231] leading-relaxed">
                        {res.description || 'Full production studio stage with private access and drive-in loading.'}
                      </p>
                    </div>

                    <div className="pt-4 mt-3 border-t border-[#D8C3A5]/60 flex items-center justify-between">
                      <span className="text-[11px] text-[#80664F] font-mono">
                        ID: {res.id}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSelectResource(res.id)}
                        rightIcon={<ArrowRight size={13} />}
                      >
                        Reserve Stage
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: DATE SELECTION */}
      {/* ===================================================================== */}
      {draft.step === 3 && selectedService && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#D8C3A5] pb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                Step 3 of 7
              </span>
              <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
                Select Appointment Date
              </h2>
              <p className="text-xs text-[#594231] mt-0.5">
                Times will be displayed in <strong>{business.timezone.replace('_', ' ')}</strong> local time.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDraft(prev => ({ ...prev, step: 2 }))}
              leftIcon={<ChevronLeft size={14} />}
            >
              Back to {business.config.rules.requiresSpecialistSelection ? business.config.terminology.specialist : 'Space'}
            </Button>
          </div>

          {/* Current Selection Pill */}
          <div className="bg-[#FAF6F0] border border-[#D8C3A5] p-3.5 rounded-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#80664F]">Curated Service:</span>
              <strong className="text-[#30251E]">{selectedService.name}</strong>
              <span className="text-[#80664F]">•</span>
              <span className="text-[#80664F]">Provider:</span>
              <strong className="text-[#30251E]">
                {draft.selectedStaffId === 'any' 
                  ? 'First Available Specialist' 
                  : resolvedSpecialist?.name || resolvedResource?.name || 'Standard Allocation'}
              </strong>
            </div>

            {selectedService.maxCapacity > 1 && (
              <Badge variant="taupe" size="sm">
                Party size: {draft.requestedAttendees}
              </Badge>
            )}
          </div>

          {/* Calendar Dates Grid */}
          <Card variant="ivory" className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8C3A5] pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-[#B58A55]" />
                <span className="font-editorial text-base font-semibold text-[#30251E]">
                  Upcoming Available Dates (Next {business.config.rules.maxAdvanceDays || 60} Days)
                </span>
              </div>
              <span className="text-[11px] text-[#80664F]">
                Click an open day to view available times
              </span>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2">
              {availableDates.slice(0, 35).map((d) => {
                const isSelected = draft.selectedDate === d.date;
                const [y, m, dayNum] = d.date.split('-');
                const monthName = new Date(Date.UTC(Number(y), Number(m) - 1, Number(dayNum), 12)).toLocaleDateString('en-US', { month: 'short' });

                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={!d.isOpen}
                    onClick={() => handleSelectDate(d.date)}
                    className={`p-2.5 rounded-sm border text-left flex flex-col justify-between min-h-[72px] transition-all ${
                      isSelected
                        ? 'bg-[#30251E] text-white border-[#30251E] shadow-sm'
                        : d.isOpen
                        ? 'bg-white text-[#30251E] border-[#D8C3A5] hover:border-[#B58A55] hover:bg-[#FAF6F0] cursor-pointer'
                        : 'bg-[#EFE5D5]/50 text-[#80664F]/50 border-[#D8C3A5]/40 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">
                        {d.weekdayLabel.substring(0, 3)}
                      </span>
                      <span className="text-[10px]">
                        {monthName}
                      </span>
                    </div>

                    <span className="font-editorial text-xl font-bold mt-1">
                      {Number(dayNum)}
                    </span>

                    <span className="text-[9px] mt-1 line-clamp-1">
                      {d.isOpen ? 'Available' : d.reason || 'Closed'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#D8C3A5] flex items-center justify-between text-xs text-[#80664F]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-white border border-[#D8C3A5]" />
                  <span>Open for Bookings</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#EFE5D5] border border-[#D8C3A5]" />
                  <span>Closed / Holiday</span>
                </span>
              </div>

              {draft.selectedDate && (
                <span className="text-[#30251E] font-medium">
                  Selected: <strong>{formatEditorialDate(draft.selectedDate)}</strong>
                </span>
              )}
            </div>
          </Card>
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 4: TIME SELECTION */}
      {/* ===================================================================== */}
      {draft.step === 4 && selectedService && draft.selectedDate && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#D8C3A5] pb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                Step 4 of 7
              </span>
              <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
                Select Appointment Time Slot
              </h2>
              <p className="text-xs text-[#594231] mt-0.5">
                Available slots for <strong>{formatEditorialDate(draft.selectedDate)}</strong> ({business.timezone.replace('_', ' ')}).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDraft(prev => ({ ...prev, step: 3 }))}
                leftIcon={<ChevronLeft size={14} />}
              >
                Change Date
              </Button>
            </div>
          </div>

          {/* Context banner */}
          <div className="bg-[#FAF6F0] border border-[#D8C3A5] p-3.5 rounded-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[#B58A55]" />
              <span className="text-[#80664F]">Duration:</span>
              <strong className="text-[#30251E]">{formatDuration(selectedService.durationMinutes)}</strong>
              <span className="text-[#80664F]">•</span>
              <span className="text-[#80664F]">Provider:</span>
              <strong className="text-[#30251E]">
                {draft.selectedStaffId === 'any' ? 'First Available Specialist' : resolvedSpecialist?.name || 'Assigned Specialist'}
              </strong>
            </div>

            <span className="text-[#80664F] font-mono text-[11px]">
              Buffer: {business.config.rules.bufferMinutes || 0} min post-treatment
            </span>
          </div>

          {/* Time Slots Display */}
          {availableSlots.length > 0 ? (
            <div className="space-y-6">
              {/* Morning Slots */}
              {groupedSlots.morning.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block">
                    Morning Sessions
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {groupedSlots.morning.map(slot => (
                      <SlotButton
                        key={slot.timeSlot}
                        slot={slot}
                        isSelected={draft.selectedTime === slot.timeSlot}
                        onClick={() => handleSelectSlot(slot)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Afternoon Slots */}
              {groupedSlots.afternoon.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block">
                    Afternoon Sessions
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {groupedSlots.afternoon.map(slot => (
                      <SlotButton
                        key={slot.timeSlot}
                        slot={slot}
                        isSelected={draft.selectedTime === slot.timeSlot}
                        onClick={() => handleSelectSlot(slot)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Evening Slots */}
              {groupedSlots.evening.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block">
                    Evening Sessions
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {groupedSlots.evening.map(slot => (
                      <SlotButton
                        key={slot.timeSlot}
                        slot={slot}
                        isSelected={draft.selectedTime === slot.timeSlot}
                        onClick={() => handleSelectSlot(slot)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card variant="sand" className="p-8 text-center space-y-3">
              <Clock size={28} className="mx-auto text-[#B58A55]" />
              <div className="space-y-1">
                <h3 className="font-editorial text-lg font-semibold text-[#30251E]">
                  No Available Appointments for this Date
                </h3>
                <p className="text-xs text-[#594231] max-w-md mx-auto">
                  All sessions on {formatEditorialDate(draft.selectedDate)} are fully reserved or outside scheduled working shifts. Please choose another date or select another specialist.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setDraft(prev => ({ ...prev, step: 3 }))}
              >
                Choose Another Date
              </Button>
            </Card>
          )}

          {/* CONFIRMED SELECTION BRIEFING & ADVANCE TO STEP 5 */}
          {draft.selectedTime && selectedSlotEntity && (
            <div className="p-6 bg-[#FAF6F0] border border-[#B58A55] rounded-sm shadow-md space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-[#D8C3A5] pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#465945]" />
                  <h3 className="font-editorial text-lg font-semibold text-[#30251E]">
                    Appointment Slot Selected
                  </h3>
                </div>
                <Badge variant="gold" size="sm">
                  Verified by Availability Engine
                </Badge>
              </div>

              {/* Summary specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                    Service
                  </span>
                  <p className="font-medium text-[#30251E] mt-0.5">
                    {selectedService.name}
                  </p>
                  <p className="text-[#80664F]">
                    {formatCurrency(selectedService.price, business.currency)} • {formatDuration(selectedService.durationMinutes)}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                    Assigned Specialist
                  </span>
                  <p className="font-medium text-[#30251E] mt-0.5">
                    {resolvedSpecialist?.name || 'Dedicated Specialist'}
                  </p>
                  <p className="text-[#80664F]">
                    {resolvedSpecialist?.title || 'Artisan Stylist'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                    Date & Time
                  </span>
                  <p className="font-medium text-[#30251E] mt-0.5">
                    {formatEditorialDate(draft.selectedDate)}
                  </p>
                  <p className="text-[#80664F]">
                    {draft.selectedTime} – {selectedSlotEntity.endTime} ({business.timezone.replace('_', ' ')})
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                    Party Size
                  </span>
                  <p className="font-medium text-[#30251E] mt-0.5">
                    {draft.requestedAttendees} {draft.requestedAttendees === 1 ? 'Attendee' : 'Attendees'}
                  </p>
                  <p className="text-[#80664F]">
                    {selectedSlotEntity.remainingCapacity} seats remaining
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#D8C3A5]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDraft(prev => ({ ...prev, selectedTime: null }))}
                >
                  Change Slot
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setDraft(prev => ({ ...prev, step: 5 }))}
                  rightIcon={<ArrowRight size={16} />}
                >
                  Continue to Guest Details
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 5: GUEST DETAILS */}
      {/* ===================================================================== */}
      {draft.step === 5 && selectedService && draft.selectedDate && draft.selectedTime && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#D8C3A5] pb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                Step 5 of 7
              </span>
              <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
                Guest Information & Details
              </h2>
              <p className="text-xs text-[#594231] mt-0.5">
                Please provide your contact details to receive your booking confirmation and direct notifications.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDraft(prev => ({ ...prev, step: 4 }))}
              leftIcon={<ChevronLeft size={14} />}
            >
              Back to Time Selection
            </Button>
          </div>

          {/* Mini context banner */}
          <div className="bg-[#FAF6F0] border border-[#D8C3A5] p-3.5 rounded-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CalendarIcon size={14} className="text-[#B58A55]" />
              <strong className="text-[#30251E]">{selectedService.name}</strong>
              <span className="text-[#80664F]">•</span>
              <span className="text-[#594231]">{formatEditorialDate(draft.selectedDate)} at {draft.selectedTime}</span>
              <span className="text-[#80664F]">•</span>
              <span className="text-[#80664F]">{resolvedSpecialist?.name || 'Assigned Specialist'}</span>
            </div>
            <span className="font-editorial text-sm font-semibold text-[#30251E]">
              {formatCurrency(selectedService.price, business.currency)}
            </span>
          </div>

          {/* Guest Information Form */}
          <form onSubmit={handleProceedToReview} className="space-y-6">
            <Card variant="ivory" className="p-6 space-y-5">
              <div className="border-b border-[#D8C3A5] pb-3">
                <h3 className="font-editorial text-lg font-semibold text-[#30251E] flex items-center gap-2">
                  <User size={18} className="text-[#B58A55]" />
                  <span>Primary Contact & Guest Details</span>
                </h3>
                <p className="text-xs text-[#594231] mt-0.5">
                  All communications regarding your reservation will be addressed to this party.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-[#30251E] flex items-center justify-between">
                    <span>Full Legal Name <span className="text-[#9E2A2B]">*</span></span>
                    {formErrors.name && (
                      <span className="text-[11px] font-normal text-[#9E2A2B]">{formErrors.name}</span>
                    )}
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#80664F]" />
                    <input
                      type="text"
                      value={draft.customerName}
                      onChange={(e) => setDraft(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="e.g. Eleanor Vance"
                      className={`w-full bg-white text-xs pl-9 pr-3 py-2.5 rounded-sm border ${
                        formErrors.name ? 'border-[#9E2A2B] focus:ring-1 focus:ring-[#9E2A2B]' : 'border-[#D8C3A5] focus:border-[#B58A55]'
                      } text-[#30251E] outline-none transition-colors`}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#30251E] flex items-center justify-between">
                    <span>Email Address <span className="text-[#9E2A2B]">*</span></span>
                    {formErrors.email && (
                      <span className="text-[11px] font-normal text-[#9E2A2B]">{formErrors.email}</span>
                    )}
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#80664F]" />
                    <input
                      type="email"
                      value={draft.customerEmail}
                      onChange={(e) => setDraft(prev => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="eleanor@example.com"
                      className={`w-full bg-white text-xs pl-9 pr-3 py-2.5 rounded-sm border ${
                        formErrors.email ? 'border-[#9E2A2B] focus:ring-1 focus:ring-[#9E2A2B]' : 'border-[#D8C3A5] focus:border-[#B58A55]'
                      } text-[#30251E] outline-none transition-colors`}
                    />
                  </div>
                  <p className="text-[10px] text-[#80664F]">
                    Your booking voucher & calendar link will be delivered here.
                  </p>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#30251E] flex items-center justify-between">
                    <span>Direct Phone Number <span className="text-[#9E2A2B]">*</span></span>
                    {formErrors.phone && (
                      <span className="text-[11px] font-normal text-[#9E2A2B]">{formErrors.phone}</span>
                    )}
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#80664F]" />
                    <input
                      type="tel"
                      value={draft.customerPhone}
                      onChange={(e) => setDraft(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="+1 (555) 019-2834"
                      className={`w-full bg-white text-xs pl-9 pr-3 py-2.5 rounded-sm border ${
                        formErrors.phone ? 'border-[#9E2A2B] focus:ring-1 focus:ring-[#9E2A2B]' : 'border-[#D8C3A5] focus:border-[#B58A55]'
                      } text-[#30251E] outline-none transition-colors`}
                    />
                  </div>
                  <p className="text-[10px] text-[#80664F]">
                    Used for concierge contact and direct appointment verification.
                  </p>
                </div>

                {/* Special Requests & Notes */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-[#30251E]">
                    Special Requests or Dietary / Accessibility Notes (Optional)
                  </label>
                  <div className="relative">
                    <FileText size={15} className="absolute left-3 top-3 text-[#80664F]" />
                    <textarea
                      rows={3}
                      value={draft.customerNotes}
                      onChange={(e) => setDraft(prev => ({ ...prev, customerNotes: e.target.value }))}
                      placeholder="Please let us know any preferences, allergies, or specific requirements for your session..."
                      className="w-full bg-white text-xs pl-9 pr-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] text-[#30251E] outline-none transition-colors resize-y"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setDraft(prev => ({ ...prev, step: 4 }))}
                leftIcon={<ChevronLeft size={16} />}
              >
                Back to Time Selection
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                rightIcon={<ArrowRight size={16} />}
              >
                Proceed to Review & Policies
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 6: BOOKING REVIEW & FINAL REVALIDATION */}
      {/* ===================================================================== */}
      {draft.step === 6 && selectedService && draft.selectedDate && draft.selectedTime && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#D8C3A5] pb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                Step 6 of 7
              </span>
              <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
                Review Your Reservation
              </h2>
              <p className="text-xs text-[#594231] mt-0.5">
                Verify all appointment details and boutique policies before finalizing your booking.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDraft(prev => ({ ...prev, step: 5 }))}
              leftIcon={<ChevronLeft size={14} />}
            >
              Edit Guest Details
            </Button>
          </div>

          {/* Submission Error Banner */}
          {submissionError && (
            <div className="p-4 bg-[#F8E7E7] border border-[#9E2A2B] rounded-sm text-[#9E2A2B] flex items-start gap-3 text-xs animate-in fade-in duration-200">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-[#9E2A2B]" />
              <div className="space-y-1">
                <strong className="block font-semibold">Reservation Could Not Be Completed:</strong>
                <p className="leading-relaxed">{submissionError}</p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDraft(prev => ({ ...prev, step: 4 }))}
                  >
                    Select Another Time Slot
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Editorial Luxury Summary Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Detailed Ledger Card */}
              <Card variant="ivory" className="p-6 space-y-6 shadow-xs">
                <div className="border-b border-[#D8C3A5] pb-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#80664F] font-semibold">
                      Curated Experience
                    </span>
                    <h3 className="font-editorial text-xl font-bold text-[#30251E] mt-0.5">
                      {selectedService.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                      Historical Snapshot
                    </span>
                    <span className="font-editorial text-2xl font-semibold text-[#30251E]">
                      {formatCurrency(selectedService.price, business.currency)}
                    </span>
                  </div>
                </div>

                {/* Appointment Specifications */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 bg-[#FAF6F0] p-3.5 rounded-sm border border-[#D8C3A5]/60">
                    <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                      Date & Schedule
                    </span>
                    <p className="font-semibold text-[#30251E]">
                      {formatEditorialDate(draft.selectedDate)}
                    </p>
                    <p className="text-[#594231]">
                      {draft.selectedTime} – {selectedSlotEntity?.endTime} ({formatDuration(selectedService.durationMinutes)})
                    </p>
                    <p className="text-[10px] text-[#80664F] font-mono mt-1">
                      Timezone: {business.timezone.replace('_', ' ')}
                    </p>
                  </div>

                  <div className="space-y-1 bg-[#FAF6F0] p-3.5 rounded-sm border border-[#D8C3A5]/60">
                    <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                      Professional Specialist
                    </span>
                    <p className="font-semibold text-[#30251E]">
                      {resolvedSpecialist?.name || 'Dedicated Boutique Artisan'}
                    </p>
                    <p className="text-[#594231]">
                      {resolvedSpecialist?.title || 'Artisan Stylist'}
                    </p>
                    {draft.selectedStaffId === 'any' && (
                      <span className="inline-block mt-1 text-[10px] text-[#465945] font-medium bg-[#465945]/10 px-2 py-0.5 rounded-xs">
                        Auto-assigned from first availability
                      </span>
                    )}
                  </div>

                  {resolvedResource && (
                    <div className="space-y-1 bg-[#FAF6F0] p-3.5 rounded-sm border border-[#D8C3A5]/60">
                      <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                        Treatment Suite / Space
                      </span>
                      <p className="font-semibold text-[#30251E]">
                        {resolvedResource.name}
                      </p>
                      <p className="text-[#594231]">
                        {resolvedResource.type} (Cap: {resolvedResource.capacity})
                      </p>
                    </div>
                  )}

                  <div className="space-y-1 bg-[#FAF6F0] p-3.5 rounded-sm border border-[#D8C3A5]/60">
                    <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                      Party Allocation
                    </span>
                    <p className="font-semibold text-[#30251E]">
                      {draft.requestedAttendees} {draft.requestedAttendees === 1 ? 'Registered Guest' : 'Registered Guests'}
                    </p>
                    <p className="text-[#594231]">
                      {selectedService.maxCapacity > 1 ? `Group Session (Max ${selectedService.maxCapacity})` : 'Private 1-on-1 Session'}
                    </p>
                  </div>
                </div>

                {/* Primary Guest Details */}
                <div className="border-t border-[#D8C3A5] pt-4 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                    Guest Credentials
                  </span>
                  <div className="flex flex-wrap gap-4 text-xs text-[#30251E]">
                    <div>
                      <span className="text-[#80664F] block text-[10px]">Name:</span>
                      <strong>{draft.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-[#80664F] block text-[10px]">Email:</span>
                      <strong>{draft.customerEmail}</strong>
                    </div>
                    <div>
                      <span className="text-[#80664F] block text-[10px]">Phone:</span>
                      <strong>{draft.customerPhone}</strong>
                    </div>
                  </div>
                  {draft.customerNotes?.trim() && (
                    <div className="pt-2 text-xs bg-[#FAF6F0] p-3 rounded-sm border border-[#D8C3A5]/50">
                      <span className="text-[10px] text-[#80664F] uppercase tracking-wider font-semibold block">Special Requests:</span>
                      <p className="text-[#594231] mt-0.5 italic">{draft.customerNotes.trim()}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Real-time revalidation assurance banner */}
              <div className="p-4 bg-[#FAF6F0] border border-[#D8C3A5] rounded-sm text-xs text-[#594231] flex items-start gap-3">
                <ShieldCheck size={18} className="text-[#B58A55] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Atomic Revalidation:</strong> Clicking &quot;Confirm & Reserve Appointment&quot; will synchronously verify slot availability against current calendar reservations, business hours, and staff shifts. No pre-payment is processed in this demonstration mode.
                </div>
              </div>
            </div>

            {/* Right Column: Policies & Execution */}
            <div className="space-y-4">
              <Card variant="sand" className="p-5 space-y-4">
                <h4 className="font-editorial text-base font-semibold text-[#30251E] border-b border-[#D8C3A5] pb-2">
                  Boutique Policies
                </h4>

                <div className="space-y-3 text-xs text-[#594231]">
                  <div>
                    <strong className="block text-[#30251E] font-medium">Cancellation Notice:</strong>
                    <span>
                      Complimentary rescheduling or cancellation up to {business.config.rules.cancellationNoticeHours || 24} hours prior to the scheduled session.
                    </span>
                  </div>

                  <div>
                    <strong className="block text-[#30251E] font-medium">Arrival Courtesy:</strong>
                    <span>
                      Please arrive 10 minutes prior to {draft.selectedTime} to allow proper intake and relaxation.
                    </span>
                  </div>

                  <div>
                    <strong className="block text-[#30251E] font-medium">Location:</strong>
                    <span className="text-[#30251E] font-medium block">
                      {business.name}
                    </span>
                    <span className="text-[11px] text-[#80664F]">
                      {business.address}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#D8C3A5] pt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#80664F]">Total Amount Due:</span>
                    <strong className="font-editorial text-lg text-[#30251E]">
                      {formatCurrency(selectedService.price, business.currency)}
                    </strong>
                  </div>
                  <span className="text-[10px] text-[#80664F] block">
                    Payment settled at boutique upon completion.
                  </span>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center shadow-md py-3 text-sm"
                  disabled={isSubmitting}
                  onClick={handleConfirmReservation}
                  leftIcon={isSubmitting ? undefined : <ShieldCheck size={18} />}
                >
                  {isSubmitting ? 'Verifying & Reserving...' : 'Confirm & Reserve Appointment'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  disabled={isSubmitting}
                  onClick={() => setDraft(prev => ({ ...prev, step: 5 }))}
                >
                  Modify Guest Details
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 7: OFFICIAL CONFIRMATION RECEIPT */}
      {/* ===================================================================== */}
      {draft.step === 7 && confirmedAppointment && (
        <section className="space-y-6 max-w-2xl mx-auto">
          {/* Success Banner */}
          <div className="text-center space-y-3 py-4">
            <div className="w-16 h-16 rounded-full bg-[#465945]/15 border-2 border-[#465945] flex items-center justify-center text-[#465945] mx-auto shadow-sm">
              <Check size={32} />
            </div>

            <span className="text-[11px] uppercase tracking-widest text-[#465945] font-semibold bg-[#465945]/10 px-3 py-1 rounded-xs border border-[#465945]/30">
              Reservation Confirmed
            </span>

            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#30251E]">
              We Look Forward to Welcoming You
            </h2>

            <p className="text-xs sm:text-sm text-[#594231] max-w-md mx-auto leading-relaxed">
              Your appointment at <strong>{business.name}</strong> is officially secured. A confirmation record has been registered in the boutique system.
            </p>
          </div>

          {/* Official Voucher Card */}
          <Card variant="ivory" className="p-6 sm:p-8 space-y-6 border-2 border-[#B58A55]/40 shadow-md">
            {/* Confirmation Header */}
            <div className="border-b border-[#D8C3A5] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#80664F] font-semibold">
                  Confirmation Code
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-2xl font-bold tracking-wider text-[#30251E]">
                    {confirmedAppointment.confirmationCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    title="Copy confirmation code"
                    className="p-1.5 rounded-sm hover:bg-[#EFE5D5] text-[#80664F] transition-colors"
                  >
                    <Copy size={16} />
                  </button>
                  {copiedCode && (
                    <span className="text-[10px] font-semibold text-[#465945] bg-[#465945]/10 px-2 py-0.5 rounded-xs animate-in fade-in duration-200">
                      Copied!
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:text-right">
                <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                  Status
                </span>
                <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-semibold text-[#465945] bg-[#465945]/15 px-2.5 py-1 rounded-xs border border-[#465945]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#465945]" />
                  Confirmed & Guaranteed
                </span>
              </div>
            </div>

            {/* Voucher Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                  Service
                </span>
                <p className="font-semibold text-sm text-[#30251E] mt-0.5">
                  {selectedService?.name || 'Curated Session'}
                </p>
                <p className="text-[#80664F]">
                  {formatDuration(selectedService?.durationMinutes || 60)} treatment duration
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                  Dedicated Specialist
                </span>
                <p className="font-semibold text-sm text-[#30251E] mt-0.5">
                  {resolvedSpecialist?.name || 'Assigned Artisan'}
                </p>
                <p className="text-[#80664F]">
                  {resolvedSpecialist?.title || 'Artisan Stylist'}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                  Date & Arrival Time
                </span>
                <p className="font-semibold text-sm text-[#30251E] mt-0.5">
                  {formatEditorialDate(confirmedAppointment.date)}
                </p>
                <p className="text-[#594231] font-medium">
                  {confirmedAppointment.timeSlot} – {confirmedAppointment.endTime} ({business.timezone.replace('_', ' ')})
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                  Party Allocation
                </span>
                <p className="font-semibold text-sm text-[#30251E] mt-0.5">
                  {confirmedAppointment.attendeesCount || 1} {confirmedAppointment.attendeesCount === 1 ? 'Guest' : 'Guests'}
                </p>
                <p className="text-[#80664F]">
                  Reserved under {confirmedCustomer?.name || confirmedAppointment.customerName}
                </p>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-[#D8C3A5]">
                <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
                  Boutique Location
                </span>
                <p className="font-medium text-[#30251E] mt-0.5 flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#B58A55] shrink-0" />
                  <span>{business.name} — {business.address}</span>
                </p>
              </div>
            </div>

            {/* Total Due Notice */}
            <div className="bg-[#FAF6F0] p-4 rounded-sm border border-[#D8C3A5] flex items-center justify-between text-xs">
              <div>
                <span className="text-[#80664F]">Total Investment:</span>
                <p className="text-[11px] text-[#594231]">Payable on arrival at boutique</p>
              </div>
              <span className="font-editorial text-2xl font-semibold text-[#30251E]">
                {formatCurrency(confirmedAppointment.price, business.currency)}
              </span>
            </div>

            {/* Local persistence sync notice */}
            <div className="p-3 bg-[#EFE5D5]/60 border border-[#D8C3A5] rounded-sm text-[11px] text-[#594231] flex items-start gap-2.5">
              <Info size={15} className="text-[#B58A55] shrink-0 mt-0.5" />
              <span>
                <strong>Demonstration Environment Notice:</strong> This appointment is stored in your browser&apos;s localStorage and is immediately visible in the Admin Ledger &amp; Calendar.
              </span>
            </div>
          </Card>

          {/* Navigation Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleBookAnother}
              leftIcon={<RotateCcw size={16} />}
            >
              Book Another Appointment
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={onNavigateAdmin}
              leftIcon={<ShieldCheck size={16} />}
            >
              Return to Management Dashboard
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};

// ===========================================================================
// SUB-COMPONENT: Slot Button
// ===========================================================================

interface SlotButtonProps {
  slot: SlotOption;
  isSelected: boolean;
  onClick: () => void;
}

const SlotButton: React.FC<SlotButtonProps> = ({ slot, isSelected, onClick }) => {
  return (
    <button
      type="button"
      disabled={!slot.available}
      onClick={onClick}
      title={slot.available ? `Reserve ${slot.timeSlot} – ${slot.endTime}` : slot.reason || 'Unavailable'}
      className={`p-2.5 rounded-sm border text-left flex flex-col justify-between transition-all min-h-[58px] ${
        isSelected
          ? 'bg-[#30251E] text-white border-[#30251E] shadow-sm ring-2 ring-[#B58A55]/50'
          : slot.available
          ? 'bg-white text-[#30251E] border-[#D8C3A5] hover:border-[#B58A55] hover:bg-[#FAF6F0] cursor-pointer'
          : 'bg-[#EFE5D5]/40 text-[#80664F]/50 border-[#D8C3A5]/40 cursor-not-allowed opacity-50'
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="font-editorial text-base font-semibold">
          {slot.timeSlot}
        </span>
        {slot.available && (
          <span className={`text-[10px] font-mono ${isSelected ? 'text-[#B58A55]' : 'text-[#80664F]'}`}>
            → {slot.endTime}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between w-full mt-1">
        <span className="text-[9px] truncate max-w-[120px]">
          {slot.available 
            ? (slot.remainingCapacity > 1 ? `${slot.remainingCapacity} spots left` : 'Available') 
            : (slot.reason || 'Reserved')}
        </span>
      </div>
    </button>
  );
};
