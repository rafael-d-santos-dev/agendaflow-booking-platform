/**
 * AgendaFlow — Customer Booking Portal Availability Engine
 * Product Specification v1.0 | Phase 3.1
 * Pure, reusable availability calculations, slot generation, staff schedule
 * evaluation, holiday overrides, lead-time enforcement, and buffer protection.
 */

import { 
  Business, 
  Service, 
  Staff, 
  Resource, 
  Appointment, 
  StorageSchema,
  SpecialClosure
} from '../types/index.ts';
import { loadStorageState, calculateEndTime } from './storage.ts';

// Mapping from JavaScript Date.getUTCDay() (0=Sun, 1=Mon, ..., 6=Sat) to Business hours keys
export const DAY_INDEX_TO_KEY: Record<number, keyof Business['hours']> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export interface BusinessDateTime {
  year: number;
  month: number;       // 1 - 12
  day: number;         // 1 - 31
  dayOfWeek: number;   // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  hours: number;       // 0 - 23
  minutes: number;     // 0 - 59
  dateString: string;  // "YYYY-MM-DD"
  timeString: string;  // "HH:MM"
  totalMinutes: number;// hours * 60 + minutes
}

export interface AvailableDateOption {
  date: string;        // "YYYY-MM-DD"
  dayOfWeek: number;   // 0 - 6
  weekdayLabel: string;// "Monday", etc.
  isOpen: boolean;
  reason?: string;     // e.g. "Closed on Sundays", "Labor Day (Special Closure)"
  isSpecialClosure: boolean;
}

export interface SlotOption {
  timeSlot: string;               // e.g. "10:00"
  endTime: string;                // e.g. "10:45"
  endTimeWithBuffer: string;      // e.g. "11:00"
  available: boolean;
  reason?: string;                // e.g. "Fully booked", "Requires 2h advance notice"
  availableStaffIds: string[];    // Eligible and free staff for this slot
  availableResourceIds: string[]; // Eligible and free resources for this slot
  remainingCapacity: number;      // For group class capacity (or 1 for individual)
  assignedStaffId?: string;       // Recommended or selected staff
  assignedResourceId?: string;    // Recommended or selected resource
}

export interface SlotValidationResult {
  valid: boolean;
  reason?: string;
  assignedStaffId?: string;
  assignedResourceId?: string;
  remainingCapacity: number;
}

/**
 * Convert time string "HH:MM" into total minutes from midnight
 */
export function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Convert minutes from midnight into 24-hour "HH:MM" string
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Get current time in the business's configured time zone using standard Intl API.
 * Accurately accounts for business-local daylight saving time and offsets.
 */
export function getNowInBusinessTimezone(timezone: string = 'UTC'): BusinessDateTime {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() + 1;
    let day = now.getUTCDate();
    let hours = now.getUTCHours();
    let minutes = now.getUTCMinutes();
    let weekdayStr = '';

    for (const part of parts) {
      if (part.type === 'year') year = Number(part.value);
      if (part.type === 'month') month = Number(part.value);
      if (part.type === 'day') day = Number(part.value);
      if (part.type === 'hour') hours = Number(part.value);
      if (part.type === 'minute') minutes = Number(part.value);
      if (part.type === 'weekday') weekdayStr = part.value;
    }

    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
    };
    const dayOfWeek = weekdayMap[weekdayStr] ?? 0;

    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    return {
      year,
      month,
      day,
      dayOfWeek,
      hours,
      minutes,
      dateString,
      timeString,
      totalMinutes: hours * 60 + minutes,
    };
  } catch {
    // Graceful fallback to UTC if time zone identifier is not supported
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const dayOfWeek = now.getUTCDay();

    return {
      year,
      month,
      day,
      dayOfWeek,
      hours,
      minutes,
      dateString: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      timeString: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      totalMinutes: hours * 60 + minutes,
    };
  }
}

/**
 * Calculate the day-of-week index (0=Sun, 1=Mon, ..., 6=Sat) for a "YYYY-MM-DD" calendar date
 */
export function getDayOfWeekFromDateString(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Construct at UTC noon to avoid timezone boundary shifts
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dateObj.getUTCDay();
}

/**
 * Filter all active staff eligible to perform a specific service in the given business
 */
export function getEligibleStaffForService(
  serviceId: string,
  businessId: string,
  state?: StorageSchema
): Staff[] {
  const current = state || loadStorageState();
  return current.staff.filter(
    s => s.businessId === businessId && s.active && s.serviceIds.includes(serviceId)
  );
}

/**
 * Filter all active resources belonging to a business and capable of hosting the service
 */
export function getEligibleResourcesForBusiness(
  businessId: string,
  service?: Service,
  state?: StorageSchema
): Resource[] {
  const current = state || loadStorageState();
  return current.resources.filter(r => {
    if (r.businessId !== businessId || !r.active) return false;
    // If service requires specific capacity, ensure resource capacity meets it
    if (service && service.maxCapacity > 1 && r.capacity < service.maxCapacity) {
      return false;
    }
    return true;
  });
}

/**
 * Retrieve calendar booking dates within the configured advance booking window
 */
export function getAvailableBookingDates(
  business: Business,
  maxAdvanceDaysOverride?: number
): AvailableDateOption[] {
  const now = getNowInBusinessTimezone(business.timezone);
  const maxAdvanceDays = maxAdvanceDaysOverride ?? business.config.rules.maxAdvanceDays ?? 60;
  const result: AvailableDateOption[] = [];

  // Anchor to business local date at noon
  const [startY, startM, startD] = now.dateString.split('-').map(Number);
  const baseTime = Date.UTC(startY, startM - 1, startD, 12, 0, 0);

  const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let offset = 0; offset <= maxAdvanceDays; offset++) {
    const curDateObj = new Date(baseTime + offset * 86400000);
    const y = curDateObj.getUTCFullYear();
    const m = curDateObj.getUTCMonth() + 1;
    const d = curDateObj.getUTCDate();
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = curDateObj.getUTCDay();
    const dayKey = DAY_INDEX_TO_KEY[dayOfWeek];

    // Check special closures
    const specialClosure = business.specialClosures?.find(c => c.date === dateStr);
    if (specialClosure) {
      if (specialClosure.isFullDay) {
        result.push({
          date: dateStr,
          dayOfWeek,
          weekdayLabel: WEEKDAY_NAMES[dayOfWeek],
          isOpen: false,
          reason: specialClosure.reason || 'Special Closure',
          isSpecialClosure: true,
        });
        continue;
      }
    }

    // Standard business hours
    const dayHours = business.hours[dayKey];
    const isOpen = dayHours ? dayHours.isOpen : false;

    result.push({
      date: dateStr,
      dayOfWeek,
      weekdayLabel: WEEKDAY_NAMES[dayOfWeek],
      isOpen,
      reason: isOpen ? undefined : `Closed on ${WEEKDAY_NAMES[dayOfWeek]}s`,
      isSpecialClosure: false,
    });
  }

  return result;
}

/**
 * Core Availability Engine:
 * Generates all discrete time slots for a business, service, and date, applying:
 * - Weekly operating hours & special closure overrides
 * - Lead time notice threshold
 * - Appointment buffer time
 * - Staff schedules, working days, breaks, and vacations
 * - Resource assignments and concurrent overlaps
 * - Group class participant capacity
 */
export function generateAvailableSlots(
  business: Business,
  service: Service,
  date: string,
  selectedStaffId?: string,
  selectedResourceId?: string,
  requestedAttendees: number = 1,
  state?: StorageSchema
): SlotOption[] {
  const current = state || loadStorageState();
  const businessNow = getNowInBusinessTimezone(business.timezone);

  // 1. Guard against past calendar dates in the business local timezone
  if (date < businessNow.dateString) {
    return [];
  }

  // 2. Guard against dates beyond maxAdvanceDays
  const maxAdvanceDays = business.config.rules.maxAdvanceDays ?? 60;
  const [startY, startM, startD] = businessNow.dateString.split('-').map(Number);
  const [targetY, targetM, targetD] = date.split('-').map(Number);
  const diffDays = Math.round(
    (Date.UTC(targetY, targetM - 1, targetD) - Date.UTC(startY, startM - 1, startD)) / 86400000
  );
  if (diffDays > maxAdvanceDays) {
    return [];
  }

  // 3. Evaluate Day Operating Hours (Special Closures vs. Standard Hours)
  const specialClosure = business.specialClosures?.find(c => c.date === date);
  if (specialClosure && specialClosure.isFullDay) {
    return [];
  }

  const dayOfWeek = getDayOfWeekFromDateString(date);
  const dayKey = DAY_INDEX_TO_KEY[dayOfWeek];
  const standardHours = business.hours[dayKey];

  let openTimeStr = standardHours?.open || '09:00';
  let closeTimeStr = standardHours?.close || '18:00';

  if (specialClosure && specialClosure.specialHours) {
    openTimeStr = specialClosure.specialHours.open;
    closeTimeStr = specialClosure.specialHours.close;
  } else if (!standardHours || !standardHours.isOpen) {
    return [];
  }

  const openMinutes = timeToMinutes(openTimeStr);
  const closeMinutes = timeToMinutes(closeTimeStr);

  if (openMinutes >= closeMinutes) {
    return [];
  }

  // 4. Extract Policies
  const leadTimeHours = business.config.rules.leadTimeHours ?? 2;
  const bufferMinutes = business.config.rules.bufferMinutes ?? 0;
  const slotIntervalMinutes = business.config.rules.slotIntervalMinutes ?? 30;
  const serviceDuration = service.durationMinutes;

  // 5. Determine Eligible Staff Candidates
  const allEligibleStaff = getEligibleStaffForService(service.id, business.id, current);
  let candidateStaff: Staff[] = [];

  if (selectedStaffId && selectedStaffId !== 'any') {
    const specificStaff = allEligibleStaff.find(s => s.id === selectedStaffId);
    if (specificStaff) candidateStaff = [specificStaff];
  } else {
    candidateStaff = allEligibleStaff;
  }

  // Filter staff by working weekdays and vacation dates
  candidateStaff = candidateStaff.filter(s => {
    // Must work on this weekday
    if (s.availableDays && !s.availableDays.includes(dayOfWeek)) {
      return false;
    }
    // Must not be on vacation / unavailable on this specific date
    if (s.schedule?.unavailableDates?.includes(date)) {
      return false;
    }
    return true;
  });

  // 6. Determine Eligible Resource Candidates
  const requiresResource = service.requiresResource || business.config.rules.requiresResourceAssignment;
  const allEligibleResources = getEligibleResourcesForBusiness(business.id, service, current);
  let candidateResources: Resource[] = [];

  if (requiresResource) {
    if (selectedResourceId) {
      const specificRes = allEligibleResources.find(r => r.id === selectedResourceId);
      if (specificRes) candidateResources = [specificRes];
    } else {
      candidateResources = allEligibleResources;
    }
  }

  // 7. Pre-filter Existing Active Appointments for this Business & Date
  const activeSameDayAppointments = current.appointments.filter(
    a => a.businessId === business.id && a.date === date && a.status !== 'cancelled'
  );

  const slots: SlotOption[] = [];

  // 8. Iterate through the Day by slotIntervalMinutes
  for (
    let slotStartMinutes = openMinutes;
    slotStartMinutes + serviceDuration <= closeMinutes;
    slotStartMinutes += slotIntervalMinutes
  ) {
    const slotStartTime = minutesToTime(slotStartMinutes);
    const slotEndTime = minutesToTime(slotStartMinutes + serviceDuration);
    const slotEndWithBufferTime = minutesToTime(slotStartMinutes + serviceDuration + bufferMinutes);
    const slotEndWithBufferMinutes = slotStartMinutes + serviceDuration + bufferMinutes;

    // Check A: Lead Time Notice for Same-Day Reservations
    if (date === businessNow.dateString) {
      const requiredLeadMinutes = businessNow.totalMinutes + leadTimeHours * 60;
      if (slotStartMinutes < requiredLeadMinutes) {
        slots.push({
          timeSlot: slotStartTime,
          endTime: slotEndTime,
          endTimeWithBuffer: slotEndWithBufferTime,
          available: false,
          reason: `Requires at least ${leadTimeHours}h advance notice`,
          availableStaffIds: [],
          availableResourceIds: [],
          remainingCapacity: 0,
        });
        continue;
      }
    }

    // Check B: Group Capacity (Kinetic Fitness / Group Workshops)
    let remainingCapacity = 1;
    if (service.maxCapacity > 1) {
      const numAttendees = Number(requestedAttendees);
      if (!Number.isInteger(numAttendees) || numAttendees <= 0 || isNaN(numAttendees)) {
        slots.push({
          timeSlot: slotStartTime,
          endTime: slotEndTime,
          endTimeWithBuffer: slotEndWithBufferTime,
          available: false,
          reason: 'Invalid attendee count requested (must be a positive whole integer).',
          availableStaffIds: [],
          availableResourceIds: [],
          remainingCapacity: 0,
        });
        continue;
      }

      const existingGroupApts = activeSameDayAppointments.filter(
        a => a.serviceId === service.id && a.timeSlot === slotStartTime
      );
      const bookedCount = existingGroupApts.reduce((sum, a) => sum + (a.attendeesCount || 1), 0);
      remainingCapacity = Math.max(0, service.maxCapacity - bookedCount);

      if (bookedCount + numAttendees > service.maxCapacity) {
        slots.push({
          timeSlot: slotStartTime,
          endTime: slotEndTime,
          endTimeWithBuffer: slotEndWithBufferTime,
          available: false,
          reason: remainingCapacity === 0 
            ? 'Class fully booked (0 spots left)' 
            : `Insufficient capacity (${remainingCapacity} spots remaining, ${requestedAttendees} requested)`,
          availableStaffIds: [],
          availableResourceIds: [],
          remainingCapacity,
        });
        continue;
      }
    }

    // Check C: Staff Availability & Conflicts
    const freeStaffForSlot: Staff[] = [];

    if (business.config.rules.requiresSpecialistSelection || (selectedStaffId && selectedStaffId !== 'any')) {
      for (const st of candidateStaff) {
        // Individual shift hours check
        const staffShiftStart = st.schedule?.start ? timeToMinutes(st.schedule.start) : openMinutes;
        const staffShiftEnd = st.schedule?.end ? timeToMinutes(st.schedule.end) : closeMinutes;

        if (slotStartMinutes < staffShiftStart || slotStartMinutes + serviceDuration > staffShiftEnd) {
          continue; // Outside this professional's working shift
        }

        // Breaks overlap check
        if (st.schedule?.breaks && st.schedule.breaks.length > 0) {
          const overlapsBreak = st.schedule.breaks.some(b => {
            const bStart = timeToMinutes(b.start);
            const bEnd = timeToMinutes(b.end);
            // Overlap: slotStart < bEnd && slotEnd > bStart
            return slotStartMinutes < bEnd && slotStartMinutes + serviceDuration > bStart;
          });
          if (overlapsBreak) {
            continue; // Overlaps scheduled rest/lunch break
          }
        }

        // Existing appointments and buffer conflict for this staff member
        const hasStaffConflict = activeSameDayAppointments.some(a => {
          if (a.staffId !== st.id) return false;
          // For group class reservations with the SAME staff, multiple attendees are allowed
          if (service.maxCapacity > 1 && a.serviceId === service.id && a.timeSlot === slotStartTime) {
            return false;
          }

          const aptStartMinutes = timeToMinutes(a.timeSlot);
          const aptEndWithBufferMinutes = timeToMinutes(a.endTime) + bufferMinutes;

          // Symmetric buffer collision: max(slotStart, aptStart) < min(slotEndWithBuffer, aptEndWithBuffer)
          const overlap = 
            Math.max(slotStartMinutes, aptStartMinutes) < 
            Math.min(slotEndWithBufferMinutes, aptEndWithBufferMinutes);

          return overlap;
        });

        if (!hasStaffConflict) {
          freeStaffForSlot.push(st);
        }
      }
    }

    // Check D: Resource Availability & Conflicts
    const freeResourcesForSlot: Resource[] = [];

    if (requiresResource) {
      for (const res of candidateResources) {
        // For group classes, multiple attendees in the exact same class slot share the resource
        const hasResourceConflict = activeSameDayAppointments.some(a => {
          if (a.resourceId !== res.id) return false;
          if (service.maxCapacity > 1 && a.serviceId === service.id && a.timeSlot === slotStartTime) {
            return false;
          }

          const aptStartMinutes = timeToMinutes(a.timeSlot);
          const aptEndWithBufferMinutes = timeToMinutes(a.endTime) + bufferMinutes;

          const overlap = 
            Math.max(slotStartMinutes, aptStartMinutes) < 
            Math.min(slotEndWithBufferMinutes, aptEndWithBufferMinutes);

          return overlap;
        });

        if (!hasResourceConflict) {
          freeResourcesForSlot.push(res);
        }
      }
    }

    // Check E: Overall Slot Eligibility Synthesis
    const isSpecialistRequired = business.config.rules.requiresSpecialistSelection || (selectedStaffId && selectedStaffId !== 'any');
    const specialistSatisfied = !isSpecialistRequired || freeStaffForSlot.length > 0;
    const resourceSatisfied = !requiresResource || freeResourcesForSlot.length > 0;

    if (!specialistSatisfied) {
      slots.push({
        timeSlot: slotStartTime,
        endTime: slotEndTime,
        endTimeWithBuffer: slotEndWithBufferTime,
        available: false,
        reason: 'Selected professional is unavailable for this interval',
        availableStaffIds: [],
        availableResourceIds: [],
        remainingCapacity,
      });
      continue;
    }

    if (!resourceSatisfied) {
      slots.push({
        timeSlot: slotStartTime,
        endTime: slotEndTime,
        endTimeWithBuffer: slotEndWithBufferTime,
        available: false,
        reason: 'No required suite or studio bay available for this interval',
        availableStaffIds: freeStaffForSlot.map(s => s.id),
        availableResourceIds: [],
        remainingCapacity,
      });
      continue;
    }

    // Slot is completely free and valid
    slots.push({
      timeSlot: slotStartTime,
      endTime: slotEndTime,
      endTimeWithBuffer: slotEndWithBufferTime,
      available: true,
      availableStaffIds: freeStaffForSlot.map(s => s.id),
      availableResourceIds: freeResourcesForSlot.map(r => r.id),
      remainingCapacity,
      assignedStaffId: selectedStaffId && selectedStaffId !== 'any' ? selectedStaffId : freeStaffForSlot[0]?.id,
      assignedResourceId: selectedResourceId ? selectedResourceId : freeResourcesForSlot[0]?.id,
    });
  }

  return slots;
}

/**
 * Final Synchronous Revalidation immediately prior to persisting an appointment
 */
export function validateSlotAvailability(
  business: Business,
  service: Service,
  date: string,
  timeSlot: string,
  staffId?: string,
  resourceId?: string,
  attendeesCount: number = 1,
  state?: StorageSchema
): SlotValidationResult {
  const numAttendees = Number(attendeesCount);
  if (!Number.isInteger(numAttendees) || numAttendees <= 0 || isNaN(numAttendees)) {
    return {
      valid: false,
      reason: 'Requested attendee count must be a positive whole integer (1 or more).',
      remainingCapacity: 0,
    };
  }

  const slots = generateAvailableSlots(
    business,
    service,
    date,
    staffId,
    resourceId,
    numAttendees,
    state
  );

  const matched = slots.find(s => s.timeSlot === timeSlot);
  if (!matched) {
    return {
      valid: false,
      reason: `Proposed time slot ${timeSlot} is outside operating hours or violates scheduling rules.`,
      remainingCapacity: 0,
    };
  }

  if (!matched.available) {
    return {
      valid: false,
      reason: matched.reason || 'The selected time slot is no longer available.',
      remainingCapacity: matched.remainingCapacity,
    };
  }

  return {
    valid: true,
    assignedStaffId: matched.assignedStaffId || staffId,
    assignedResourceId: matched.assignedResourceId || resourceId,
    remainingCapacity: matched.remainingCapacity,
  };
}
