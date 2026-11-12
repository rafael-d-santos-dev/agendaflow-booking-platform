/**
 * AgendaFlow — Versioned LocalStorage Adapter
 * Safe parsing, corruption defense, and strict businessId isolation
 */

import { INITIAL_STORAGE_STATE, SEED_BUSINESSES } from '../data/seedData.ts';
import { 
  StorageSchema, 
  Business, 
  Service, 
  Staff, 
  Resource, 
  Customer, 
  Appointment, 
  AppointmentStatus,
  SpecialClosure,
  StaffSchedule,
  IndustryRules,
  IndustryTerminology
} from '../types/index.ts';
import { validateSlotAvailability } from './availability.ts';

const STORAGE_KEY = 'agenda_flow_v1_store';
const CURRENT_VERSION = 1;

/**
 * Validate that an object has the essential structure of a StorageSchema
 */
function isValidStorageSchema(obj: unknown): obj is StorageSchema {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.version === 'number' &&
    candidate.version === CURRENT_VERSION &&
    typeof candidate.activeBusinessId === 'string' &&
    Array.isArray(candidate.businesses) &&
    Array.isArray(candidate.services) &&
    Array.isArray(candidate.staff) &&
    Array.isArray(candidate.resources) &&
    Array.isArray(candidate.customers) &&
    Array.isArray(candidate.appointments)
  );
}

let nodeMemoryStore: string | null = null;

/**
 * Load the current storage state with defense against corruption and schema drift
 */
export function loadStorageState(): StorageSchema {
  if (typeof window === 'undefined') {
    if (nodeMemoryStore) {
      try {
        const parsed = JSON.parse(nodeMemoryStore);
        if (isValidStorageSchema(parsed)) return parsed;
      } catch (e) {
        return INITIAL_STORAGE_STATE;
      }
    }
    return INITIAL_STORAGE_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First run: initialize cleanly with seed data
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STORAGE_STATE));
      return INITIAL_STORAGE_STATE;
    }

    const parsed: unknown = JSON.parse(raw);

    if (isValidStorageSchema(parsed)) {
      return parsed;
    }

    // Attempt mild migration or repair if schema version is valid but some arrays were damaged
    if (parsed && typeof parsed === 'object') {
      const partial = parsed as Partial<StorageSchema>;
      if (partial.version === CURRENT_VERSION) {
        const repaired: StorageSchema = {
          version: CURRENT_VERSION,
          activeBusinessId: partial.activeBusinessId || INITIAL_STORAGE_STATE.activeBusinessId,
          businesses: Array.isArray(partial.businesses) && partial.businesses.length > 0 ? partial.businesses : INITIAL_STORAGE_STATE.businesses,
          services: Array.isArray(partial.services) ? partial.services : INITIAL_STORAGE_STATE.services,
          staff: Array.isArray(partial.staff) ? partial.staff : INITIAL_STORAGE_STATE.staff,
          resources: Array.isArray(partial.resources) ? partial.resources : INITIAL_STORAGE_STATE.resources,
          customers: Array.isArray(partial.customers) ? partial.customers : INITIAL_STORAGE_STATE.customers,
          appointments: Array.isArray(partial.appointments) ? partial.appointments : INITIAL_STORAGE_STATE.appointments,
          lastUpdated: new Date().toISOString(),
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(repaired));
        return repaired;
      }
    }

    // In case of unrecoverable corruption, log warning and re-seed to keep app functional
    console.warn('[AgendaFlow Storage] Corrupted or legacy data detected. Restoring default demonstration state.');
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STORAGE_STATE));
    return INITIAL_STORAGE_STATE;
  } catch (error) {
    console.error('[AgendaFlow Storage] Error accessing localStorage:', error);
    return INITIAL_STORAGE_STATE;
  }
}

/**
 * Save updated state to localStorage safely
 */
export function saveStorageState(state: StorageSchema): boolean {
  const payload: StorageSchema = {
    ...state,
    version: CURRENT_VERSION,
    lastUpdated: new Date().toISOString(),
  };

  if (typeof window === 'undefined') {
    nodeMemoryStore = JSON.stringify(payload);
    return true;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // Dispatch custom storage event for in-tab reactive updates
    window.dispatchEvent(new CustomEvent('agenda-flow-storage-sync', { detail: payload }));
    return true;
  } catch (error) {
    console.error('[AgendaFlow Storage] Failed to persist state:', error);
    return false;
  }
}

/**
 * Reset storage back to demonstration factory state
 */
export function resetToDefaults(): StorageSchema {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STORAGE_STATE));
    window.dispatchEvent(new CustomEvent('agenda-flow-storage-sync', { detail: INITIAL_STORAGE_STATE }));
  }
  return INITIAL_STORAGE_STATE;
}

/**
 * Business queries with strict isolation
 */
export function getActiveBusiness(state?: StorageSchema): Business {
  const current = state || loadStorageState();
  const found = current.businesses.find(b => b.id === current.activeBusinessId);
  return found || current.businesses[0] || SEED_BUSINESSES[0];
}

export function setActiveBusinessId(businessId: string): boolean {
  const state = loadStorageState();
  const exists = state.businesses.some(b => b.id === businessId);
  if (!exists) return false;

  state.activeBusinessId = businessId;
  return saveStorageState(state);
}

export function getServicesForBusiness(
  businessId: string,
  includeInactive: boolean = false,
  state?: StorageSchema
): Service[] {
  const current = state || loadStorageState();
  return current.services.filter(s => s.businessId === businessId && (includeInactive || s.active));
}

export function getStaffForBusiness(
  businessId: string,
  includeInactive: boolean = false,
  state?: StorageSchema
): Staff[] {
  const current = state || loadStorageState();
  return current.staff.filter(s => s.businessId === businessId && (includeInactive || s.active));
}

/**
 * Create a new team member/specialist for the business
 */
export function createStaff(data: Omit<Staff, 'id'>): Staff {
  const state = loadStorageState();
  const prefix = data.businessId.substring(0, 3);
  const newStaff: Staff = {
    ...data,
    id: `stf-${prefix}-${Date.now().toString(36)}`,
  };

  state.staff.push(newStaff);
  saveStorageState(state);
  return newStaff;
}

/**
 * Update an existing staff member while preserving their ID and businessId
 */
export function updateStaff(updated: Staff): boolean {
  const state = loadStorageState();
  const index = state.staff.findIndex(s => s.id === updated.id && s.businessId === updated.businessId);
  if (index === -1) return false;

  state.staff[index] = {
    ...updated,
    id: state.staff[index].id,
    businessId: state.staff[index].businessId,
  };

  return saveStorageState(state);
}

/**
 * Toggle active/inactive status of a staff member
 */
export function toggleStaffActive(staffId: string, businessId: string): boolean {
  const state = loadStorageState();
  const member = state.staff.find(s => s.id === staffId && s.businessId === businessId);
  if (!member) return false;

  member.active = !member.active;
  return saveStorageState(state);
}

export function getStaffAssignedToService(serviceId: string, businessId: string, state?: StorageSchema): Staff[] {
  const current = state || loadStorageState();
  return current.staff.filter(s => s.businessId === businessId && s.serviceIds?.includes(serviceId));
}

/**
 * Create a new service for the business and optionally update assigned staff members
 */
export function createService(
  data: Omit<Service, 'id'>,
  assignedStaffIds?: string[]
): Service {
  const state = loadStorageState();
  const prefix = data.businessId.substring(0, 3);
  const newService: Service = {
    ...data,
    id: `srv-${prefix}-${Date.now().toString(36)}`,
  };

  state.services.push(newService);

  // Sync staff assignments
  if (Array.isArray(assignedStaffIds)) {
    state.staff.forEach(st => {
      if (st.businessId === data.businessId) {
        const isAssigned = assignedStaffIds.includes(st.id);
        const hasService = st.serviceIds.includes(newService.id);
        if (isAssigned && !hasService) {
          st.serviceIds.push(newService.id);
        } else if (!isAssigned && hasService) {
          st.serviceIds = st.serviceIds.filter(id => id !== newService.id);
        }
      }
    });
  }

  saveStorageState(state);
  return newService;
}

/**
 * Update an existing service while preserving its ID and businessId
 */
export function updateService(
  updated: Service,
  assignedStaffIds?: string[]
): boolean {
  const state = loadStorageState();
  const index = state.services.findIndex(s => s.id === updated.id && s.businessId === updated.businessId);
  if (index === -1) return false;

  state.services[index] = {
    ...updated,
    id: state.services[index].id,
    businessId: state.services[index].businessId,
  };

  // Sync staff assignments
  if (Array.isArray(assignedStaffIds)) {
    state.staff.forEach(st => {
      if (st.businessId === updated.businessId) {
        const isAssigned = assignedStaffIds.includes(updated.id);
        const hasService = st.serviceIds.includes(updated.id);
        if (isAssigned && !hasService) {
          st.serviceIds.push(updated.id);
        } else if (!isAssigned && hasService) {
          st.serviceIds = st.serviceIds.filter(id => id !== updated.id);
        }
      }
    });
  }

  return saveStorageState(state);
}

/**
 * Toggle active/inactive status of a service
 */
export function toggleServiceActive(serviceId: string, businessId: string): boolean {
  const state = loadStorageState();
  const service = state.services.find(s => s.id === serviceId && s.businessId === businessId);
  if (!service) return false;

  service.active = !service.active;
  return saveStorageState(state);
}

export function getResourcesForBusiness(
  businessId: string,
  includeInactiveOrState?: boolean | StorageSchema,
  maybeState?: StorageSchema
): Resource[] {
  let includeInactive = false;
  let state: StorageSchema | undefined;

  if (typeof includeInactiveOrState === 'boolean') {
    includeInactive = includeInactiveOrState;
    state = maybeState;
  } else if (includeInactiveOrState && typeof includeInactiveOrState === 'object') {
    state = includeInactiveOrState;
  }

  const current = state || loadStorageState();
  return current.resources.filter(r => r.businessId === businessId && (includeInactive || r.active));
}

export function getCustomersForBusiness(businessId: string, state?: StorageSchema): Customer[] {
  const current = state || loadStorageState();
  return current.customers.filter(c => c.businessId === businessId);
}

/**
 * Normalizes phone number by removing all non-digit characters.
 * If 11 digits starting with '1' (standard US country code), normalizes to 10 digits.
 */
export function normalizePhoneNumber(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }
  return digits;
}

/**
 * Create a new customer record with duplicate prevention
 */
export function createCustomer(
  data: Omit<Customer, 'id' | 'createdAt' | 'totalBookings'>
): { customer?: Customer; error?: string } {
  const state = loadStorageState();
  const normalizedEmail = data.email.toLowerCase().trim();

  // Check duplicate email within the same business
  const existingEmail = state.customers.find(
    c => c.businessId === data.businessId && c.email.toLowerCase().trim() === normalizedEmail
  );
  if (existingEmail) {
    return {
      error: `A client with the email "${data.email}" (${existingEmail.name}) is already registered in this directory.`,
    };
  }

  // Check duplicate phone within the same business if phone is present and >= 7 digits
  const normPhone = normalizePhoneNumber(data.phone);
  if (normPhone.length >= 7) {
    const existingPhone = state.customers.find(
      c => c.businessId === data.businessId && normalizePhoneNumber(c.phone) === normPhone
    );
    if (existingPhone) {
      return {
        error: `A client with the phone number "${data.phone}" (${existingPhone.name}) is already registered in this directory.`,
      };
    }
  }

  const newCustomer: Customer = {
    ...data,
    id: `cst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    email: normalizedEmail,
    totalBookings: 0,
    createdAt: new Date().toISOString(),
  };

  state.customers.unshift(newCustomer);
  saveStorageState(state);
  return { customer: newCustomer };
}

/**
 * Update an existing customer record while preserving historical integrity
 */
export function updateCustomer(
  updated: Customer
): { success: boolean; error?: string } {
  const state = loadStorageState();
  const normalizedEmail = updated.email.toLowerCase().trim();

  // Check if another customer is already using this email in this business
  const duplicateEmail = state.customers.find(
    c =>
      c.businessId === updated.businessId &&
      c.id !== updated.id &&
      c.email.toLowerCase().trim() === normalizedEmail
  );
  if (duplicateEmail) {
    return {
      success: false,
      error: `Another client (${duplicateEmail.name}) is already registered with email "${updated.email}".`,
    };
  }

  // Check if another customer is already using this phone in this business
  const normPhone = normalizePhoneNumber(updated.phone);
  if (normPhone.length >= 7) {
    const duplicatePhone = state.customers.find(
      c =>
        c.businessId === updated.businessId &&
        c.id !== updated.id &&
        normalizePhoneNumber(c.phone) === normPhone
    );
    if (duplicatePhone) {
      return {
        success: false,
        error: `Another client (${duplicatePhone.name}) is already registered with phone "${updated.phone}".`,
      };
    }
  }

  const index = state.customers.findIndex(
    c => c.id === updated.id && c.businessId === updated.businessId
  );
  if (index === -1) {
    return { success: false, error: 'Customer record not found.' };
  }

  // Preserve ID, createdAt, and businessId
  state.customers[index] = {
    ...updated,
    id: state.customers[index].id,
    businessId: state.customers[index].businessId,
    createdAt: state.customers[index].createdAt,
    email: normalizedEmail,
  };

  saveStorageState(state);
  return { success: true };
}

/**
 * Get all appointments associated with a customer
 */
export function getCustomerAppointments(
  customerId: string,
  customerEmail: string,
  businessId: string,
  state?: StorageSchema
): Appointment[] {
  const current = state || loadStorageState();
  const normEmail = (customerEmail || '').toLowerCase().trim();

  return current.appointments
    .filter(
      a =>
        a.businessId === businessId &&
        (a.customerId === customerId || (normEmail && a.customerEmail.toLowerCase().trim() === normEmail))
    )
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date); // newest first
      return b.timeSlot.localeCompare(a.timeSlot);
    });
}

export function getAppointmentsForBusiness(businessId: string, state?: StorageSchema): Appointment[] {
  const current = state || loadStorageState();
  return current.appointments.filter(a => a.businessId === businessId);
}

/**
 * Add a new appointment with unique confirmation code and customer link
 */
export function createAppointment(
  data: Omit<Appointment, 'id' | 'createdAt' | 'confirmationCode'>
): Appointment {
  const state = loadStorageState();
  
  // Generate distinct editorial booking code (e.g. AF-7492-ATEL)
  const codePrefix = data.businessId.substring(0, 4).toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const confirmationCode = `AF-${randomNum}-${codePrefix}`;

  const newAppointment: Appointment = {
    ...data,
    id: `apt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    confirmationCode,
    createdAt: new Date().toISOString(),
  };

  state.appointments.unshift(newAppointment);

  // Link or update customer record
  const existingCustomer = state.customers.find(
    c => c.businessId === data.businessId && c.email.toLowerCase() === data.customerEmail.toLowerCase()
  );

  if (existingCustomer) {
    existingCustomer.totalBookings += 1;
    existingCustomer.name = data.customerName;
    existingCustomer.phone = data.customerPhone;
  } else {
    const newCustomer: Customer = {
      id: `cst-${Date.now()}`,
      businessId: data.businessId,
      name: data.customerName,
      email: data.customerEmail,
      phone: data.customerPhone,
      totalBookings: 1,
      createdAt: new Date().toISOString(),
    };
    state.customers.push(newCustomer);
  }

  saveStorageState(state);
  return newAppointment;
}

/**
 * Update an existing appointment's details while preserving ID, confirmationCode, and businessId
 */
export function updateAppointment(updated: Appointment): boolean {
  const state = loadStorageState();
  const index = state.appointments.findIndex(a => a.id === updated.id && a.businessId === updated.businessId);
  if (index === -1) return false;

  // Preserve core immutable identifiers
  state.appointments[index] = {
    ...updated,
    id: state.appointments[index].id,
    confirmationCode: state.appointments[index].confirmationCode,
    businessId: state.appointments[index].businessId,
  };

  return saveStorageState(state);
}

/**
 * Update status of an appointment
 */
export function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus): boolean {
  const state = loadStorageState();
  const apt = state.appointments.find(a => a.id === appointmentId);
  if (!apt) return false;

  apt.status = status;
  return saveStorageState(state);
}

/**
 * Calculate appointment end time from start time and duration in minutes
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMinutes = (h || 0) * 60 + (m || 0) + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export interface ConflictValidationResult {
  hasConflict: boolean;
  reason?: string;
}

/**
 * Validate scheduling conflicts against staff, resources, and capacity limits.
 * Cancelled appointments never cause conflicts.
 */
export function validateAppointmentConflict(
  businessId: string,
  date: string,
  timeSlot: string,
  endTime: string,
  staffId?: string,
  resourceId?: string,
  serviceId?: string,
  excludeAppointmentId?: string,
  attendeesCount: number = 1
): ConflictValidationResult {
  const state = loadStorageState();
  const service = state.services.find(s => s.id === serviceId && s.businessId === businessId);

  // Group class capacity check (e.g. Kinetic Fitness Studio)
  if (service && service.maxCapacity > 1) {
    const existingGroupApts = state.appointments.filter(
      a =>
        a.businessId === businessId &&
        a.serviceId === serviceId &&
        a.date === date &&
        a.timeSlot === timeSlot &&
        a.status !== 'cancelled' &&
        a.id !== excludeAppointmentId
    );

    const currentBooked = existingGroupApts.reduce((sum, a) => sum + (a.attendeesCount || 1), 0);
    if (currentBooked + attendeesCount > service.maxCapacity) {
      return {
        hasConflict: true,
        reason: `Class capacity limit reached. Maximum capacity is ${service.maxCapacity} participants (currently reserved: ${currentBooked}).`,
      };
    }
  }

  // Active appointments on the same date for the business
  const sameDayApts = state.appointments.filter(
    a =>
      a.businessId === businessId &&
      a.date === date &&
      a.status !== 'cancelled' &&
      a.id !== excludeAppointmentId
  );

  // Check time overlap: startA < endB && endA > startB
  for (const existing of sameDayApts) {
    const overlaps = timeSlot < existing.endTime && endTime > existing.timeSlot;

    if (overlaps) {
      // 1. Staff conflict
      if (staffId && existing.staffId && staffId === existing.staffId) {
        const staffObj = state.staff.find(s => s.id === staffId);
        return {
          hasConflict: true,
          reason: `${staffObj?.name || 'Selected professional'} is already booked for an appointment from ${existing.timeSlot} to ${existing.endTime}.`,
        };
      }

      // 2. Resource conflict
      if (resourceId && existing.resourceId && resourceId === existing.resourceId) {
        const resObj = state.resources.find(r => r.id === resourceId);
        return {
          hasConflict: true,
          reason: `${resObj?.name || 'Selected resource/suite'} is already reserved from ${existing.timeSlot} to ${existing.endTime}.`,
        };
      }
    }
  }

  return { hasConflict: false };
}

/**
 * Update business profile details (name, tagline, description, email, phone, address, timezone, currency)
 * Preserves immutable ID, slug, and industry.
 */
export function updateBusinessProfile(
  businessId: string,
  updates: Partial<Pick<Business, 'name' | 'tagline' | 'description' | 'email' | 'phone' | 'address' | 'timezone' | 'currency'>>
): boolean {
  const state = loadStorageState();
  const index = state.businesses.findIndex(b => b.id === businessId);
  if (index === -1) return false;

  state.businesses[index] = {
    ...state.businesses[index],
    ...updates,
    id: state.businesses[index].id,
    slug: state.businesses[index].slug,
    industry: state.businesses[index].industry,
  };

  return saveStorageState(state);
}

/**
 * Update weekly operating hours for a business
 */
export function updateBusinessHours(
  businessId: string,
  hours: Business['hours']
): boolean {
  const state = loadStorageState();
  const index = state.businesses.findIndex(b => b.id === businessId);
  if (index === -1) return false;

  state.businesses[index].hours = hours;
  return saveStorageState(state);
}

/**
 * Update booking policies (IndustryRules) for a business
 */
export function updateBookingPolicies(
  businessId: string,
  rules: Partial<IndustryRules>
): boolean {
  const state = loadStorageState();
  const index = state.businesses.findIndex(b => b.id === businessId);
  if (index === -1) return false;

  state.businesses[index].config.rules = {
    ...state.businesses[index].config.rules,
    ...rules,
  };

  return saveStorageState(state);
}

/**
 * Update terminology for a business
 */
export function updateBusinessTerminology(
  businessId: string,
  terminology: Partial<IndustryTerminology>
): boolean {
  const state = loadStorageState();
  const index = state.businesses.findIndex(b => b.id === businessId);
  if (index === -1) return false;

  state.businesses[index].config.terminology = {
    ...state.businesses[index].config.terminology,
    ...terminology,
  };

  return saveStorageState(state);
}

/**
 * Add a special closure or holiday for a business
 */
export function addSpecialClosure(
  businessId: string,
  closure: Omit<SpecialClosure, 'id' | 'businessId'>
): { success: boolean; error?: string; closure?: SpecialClosure } {
  const state = loadStorageState();
  const business = state.businesses.find(b => b.id === businessId);
  if (!business) return { success: false, error: 'Business not found.' };

  if (!business.specialClosures) {
    business.specialClosures = [];
  }

  // Check duplicate date within the same business
  const exists = business.specialClosures.some(c => c.date === closure.date);
  if (exists) {
    return {
      success: false,
      error: `A special closure is already scheduled for date ${closure.date}.`,
    };
  }

  const newClosure: SpecialClosure = {
    ...closure,
    id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    businessId,
  };

  business.specialClosures.push(newClosure);
  // Sort closures chronologically
  business.specialClosures.sort((a, b) => a.date.localeCompare(b.date));

  saveStorageState(state);
  return { success: true, closure: newClosure };
}

/**
 * Delete a special closure by ID
 */
export function deleteSpecialClosure(businessId: string, closureId: string): boolean {
  const state = loadStorageState();
  const business = state.businesses.find(b => b.id === businessId);
  if (!business || !business.specialClosures) return false;

  business.specialClosures = business.specialClosures.filter(c => c.id !== closureId);
  return saveStorageState(state);
}

/**
 * Update individual staff schedule (working hours, breaks, time-off dates, available days)
 */
export function updateStaffSchedule(
  staffId: string,
  schedule: StaffSchedule,
  availableDays?: number[]
): boolean {
  const state = loadStorageState();
  const member = state.staff.find(s => s.id === staffId);
  if (!member) return false;

  member.schedule = schedule;
  if (availableDays) {
    member.availableDays = availableDays;
  }

  return saveStorageState(state);
}

/**
 * Create a new physical or virtual resource
 */
export function createResource(
  data: Omit<Resource, 'id'>
): Resource {
  const state = loadStorageState();
  const newResource: Resource = {
    ...data,
    id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  state.resources.push(newResource);
  saveStorageState(state);
  return newResource;
}

/**
 * Update resource details
 */
export function updateResource(updated: Resource): boolean {
  const state = loadStorageState();
  const index = state.resources.findIndex(r => r.id === updated.id && r.businessId === updated.businessId);
  if (index === -1) return false;

  state.resources[index] = {
    ...updated,
    id: state.resources[index].id,
    businessId: state.resources[index].businessId,
  };

  return saveStorageState(state);
}

/**
 * Toggle resource active status
 */
export function toggleResourceActive(resourceId: string, businessId: string): boolean {
  const state = loadStorageState();
  const res = state.resources.find(r => r.id === resourceId && r.businessId === businessId);
  if (!res) return false;

  res.active = !res.active;
  return saveStorageState(state);
}

export interface CustomerBookingRequest {
  businessId: string;
  serviceId: string;
  staffId?: string;
  resourceId?: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:MM
  attendeesCount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes?: string;
}

export interface CustomerBookingResult {
  success: boolean;
  appointment?: Appointment;
  customer?: Customer;
  error?: string;
}

/**
 * Dedicated Customer Booking Persistence Flow (Phase 3.3)
 * Enforces Mandatory Audit Conditions A, B, and C:
 * 1. Synchronous revalidation against the freshest storage state via validateSlotAvailability.
 * 2. Strict attendee validation rejecting non-positive or non-integer values.
 * 3. Real staff assignment verification (never 'any' or unassigned when required).
 * 4. Safe customer deduplication without accidental cross-merges or orphan records.
 */
export function bookCustomerAppointment(
  request: CustomerBookingRequest
): CustomerBookingResult {
  // 1. Read the latest storage state
  const state = loadStorageState();

  // 2. Validate Business
  const business = state.businesses.find(b => b.id === request.businessId);
  if (!business) {
    return { success: false, error: 'Business context not found.' };
  }

  // 3. Validate Service (must be active and belong to business)
  const service = state.services.find(
    s => s.id === request.serviceId && s.businessId === request.businessId && s.active
  );
  if (!service) {
    return { success: false, error: 'The selected service is inactive or no longer available.' };
  }

  // 4. Mandatory Condition B: Strict Attendee Validation
  const attendees = Number(request.attendeesCount);
  if (
    !Number.isFinite(attendees) ||
    !Number.isInteger(attendees) ||
    attendees <= 0 ||
    isNaN(attendees)
  ) {
    return {
      success: false,
      error: 'Requested attendee count must be a positive whole integer (1 or more).',
    };
  }

  if (service.maxCapacity > 1 && attendees > service.maxCapacity) {
    return {
      success: false,
      error: `Requested attendee count (${attendees}) exceeds maximum class capacity of ${service.maxCapacity}.`,
    };
  }

  // 5. Mandatory Condition C: Real Staff Assignment Verification
  let actualStaffId: string | undefined = request.staffId;
  const specialistRequired = business.config.rules.requiresSpecialistSelection;

  if (specialistRequired) {
    if (!actualStaffId || actualStaffId === 'any') {
      return {
        success: false,
        error: 'A specific valid professional must be assigned to this booking.',
      };
    }

    const assignedStaff = state.staff.find(
      s => s.id === actualStaffId && s.businessId === request.businessId && s.active
    );
    if (!assignedStaff) {
      return {
        success: false,
        error: 'The assigned specialist is inactive or no longer available.',
      };
    }

    if (!assignedStaff.serviceIds.includes(service.id)) {
      return {
        success: false,
        error: 'The assigned specialist is not qualified to deliver this service.',
      };
    }
  }

  // 6. Validate Resource (if required by service or business)
  let actualResourceId: string | undefined = request.resourceId;
  const resourceRequired = service.requiresResource || business.config.rules.requiresResourceAssignment;

  if (resourceRequired && actualResourceId) {
    const resource = state.resources.find(
      r => r.id === actualResourceId && r.businessId === request.businessId && r.active
    );
    if (!resource) {
      return {
        success: false,
        error: 'The required treatment suite or studio stage is no longer available.',
      };
    }
  }

  // 7. Mandatory Condition A: Revalidation Before Persistence
  // Evaluates business hours, closures, staff breaks/shifts, resource conflicts, buffer rules, and group capacity
  const slotValidation = validateSlotAvailability(
    business,
    service,
    request.date,
    request.timeSlot,
    actualStaffId,
    actualResourceId,
    attendees,
    state
  );

  if (!slotValidation.valid) {
    return {
      success: false,
      error: slotValidation.reason || 'The requested time slot is no longer available. Please select another time.',
    };
  }

  // Use resolved staff/resource if available
  if (slotValidation.assignedStaffId) {
    actualStaffId = slotValidation.assignedStaffId;
  }
  if (slotValidation.assignedResourceId) {
    actualResourceId = slotValidation.assignedResourceId;
  }

  // 8. Contact Details Validation & Customer Matching (Safe CRM logic)
  const customerName = (request.customerName || '').trim();
  const customerEmail = (request.customerEmail || '').toLowerCase().trim();
  const customerPhone = (request.customerPhone || '').trim();
  const normPhone = normalizePhoneNumber(customerPhone);

  if (!customerName) {
    return { success: false, error: 'Full customer name is required.' };
  }
  if (!customerEmail || !customerEmail.includes('@') || !customerEmail.includes('.')) {
    return { success: false, error: 'A valid email address is required for confirmation.' };
  }
  if (normPhone.length < 7) {
    return { success: false, error: 'A valid phone number with at least 7 digits is required.' };
  }

  // Search existing customers within the current business only
  const matchByEmail = state.customers.find(
    c => c.businessId === request.businessId && c.email.toLowerCase().trim() === customerEmail
  );
  const matchByPhone = normPhone.length >= 7
    ? state.customers.find(
        c => c.businessId === request.businessId && normalizePhoneNumber(c.phone) === normPhone
      )
    : undefined;

  // Collision prevention: If email belongs to client A and phone belongs to client B, prevent silent merge
  if (matchByEmail && matchByPhone && matchByEmail.id !== matchByPhone.id) {
    return {
      success: false,
      error: `Contact mismatch: Email "${request.customerEmail}" belongs to client ${matchByEmail.name}, but phone "${customerPhone}" is associated with ${matchByPhone.name}. Please verify your contact information.`,
    };
  }

  let customer = matchByEmail || matchByPhone;
  if (customer) {
    // Reuse existing customer safely
    customer.totalBookings = (customer.totalBookings || 0) + 1;
    customer.name = customerName;
    customer.phone = customerPhone;
    if (request.customerNotes?.trim() && !customer.notes?.includes(request.customerNotes.trim())) {
      customer.notes = customer.notes 
        ? `${customer.notes} | ${request.customerNotes.trim()}` 
        : request.customerNotes.trim();
    }
  } else {
    // Create new customer record
    customer = {
      id: `cst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      businessId: request.businessId,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      notes: request.customerNotes?.trim() || undefined,
      totalBookings: 1,
      createdAt: new Date().toISOString(),
    };
    state.customers.push(customer);
  }

  // 9. Create New Appointment Entity
  const endTime = calculateEndTime(request.timeSlot, service.durationMinutes);
  const codePrefix = request.businessId.substring(0, 4).toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const confirmationCode = `AF-${randomNum}-${codePrefix}`;

  const newAppointment: Appointment = {
    id: `apt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    businessId: request.businessId,
    confirmationCode,
    serviceId: service.id,
    staffId: actualStaffId,
    resourceId: actualResourceId,
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    date: request.date,
    timeSlot: request.timeSlot,
    endTime,
    status: 'confirmed',
    notes: request.customerNotes?.trim() || undefined,
    price: service.price, // freeze historical price snapshot
    attendeesCount: attendees,
    createdAt: new Date().toISOString(),
  };

  state.appointments.unshift(newAppointment);

  // 10. Persist atomically to LocalStorage
  const saved = saveStorageState(state);
  if (!saved) {
    return {
      success: false,
      error: 'Storage write failure: unable to record reservation in local storage.',
    };
  }

  return {
    success: true,
    appointment: newAppointment,
    customer,
  };
}
