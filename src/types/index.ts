/**
 * AgendaFlow — Core TypeScript Data Models
 * Product Specification v1.0 | Editorial Luxury SaaS
 */

export type IndustryType = 'salon' | 'clinic' | 'consulting' | 'fitness' | 'studio';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface IndustryTerminology {
  service: string;       // e.g., "Treatment", "Session", "Class", "Studio Rental"
  services: string;      // e.g., "Treatments", "Consultations", "Group Classes", "Studio Spaces"
  specialist: string;    // e.g., "Stylist", "Specialist", "Senior Partner", "Coach", "Studio Space"
  specialists: string;   // e.g., "Stylists", "Doctors", "Consultants", "Trainers", "Spaces"
  customer: string;      // e.g., "Client", "Patient", "Guest", "Member"
  bookingAction: string; // e.g., "Reserve Appointment", "Book Session", "Enroll in Class"
}

export interface IndustryRules {
  requiresSpecialistSelection: boolean;
  allowsGroupBooking: boolean;
  defaultMaxCapacity: number;
  slotIntervalMinutes: number;
  requiresResourceAssignment: boolean;
  leadTimeHours: number;
  // Booking policy extensions (optional, backward compatible)
  bufferMinutes?: number;
  maxAdvanceDays?: number;
  cancellationNoticeHours?: number;
  rescheduleNoticeHours?: number;
}

export interface IndustryConfiguration {
  terminology: IndustryTerminology;
  rules: IndustryRules;
  badge: string;
  themeAccent: string;
}

export interface BusinessHours {
  open: string;  // "09:00"
  close: string; // "19:00"
  isOpen: boolean;
}

export interface SpecialClosure {
  id: string;
  businessId: string;
  date: string; // YYYY-MM-DD
  reason: string;
  isFullDay: boolean;
  specialHours?: { open: string; close: string };
}

export interface Business {
  id: string; // e.g., 'atelier-salon', 'aura-clinic', 'vanguard-consulting', 'kinetic-fitness', 'monolith-studio'
  slug: string;
  name: string;
  tagline: string;
  description: string;
  industry: IndustryType;
  currency: string;
  timezone: string;
  email: string;
  phone: string;
  address: string;
  hours: Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', BusinessHours>;
  config: IndustryConfiguration;
  specialClosures?: SpecialClosure[];
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  category: string;
  maxCapacity: number; // 1 for individual, >1 for group classes (e.g. Kinetic)
  requiresResource: boolean;
  active: boolean;
}

export interface StaffBreak {
  start: string; // e.g. "12:00"
  end: string;   // e.g. "13:00"
}

export interface StaffSchedule {
  start?: string; // e.g. "09:00"
  end?: string;   // e.g. "18:00"
  breaks?: StaffBreak[];
  unavailableDates?: string[]; // ["2026-12-25", ...]
}

export interface Staff {
  id: string;
  businessId: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl?: string;
  specialties: string[];
  serviceIds: string[];
  availableDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  active: boolean;
  schedule?: StaffSchedule;
}

export interface Resource {
  id: string;
  businessId: string;
  name: string;
  type: 'room' | 'studio' | 'equipment';
  capacity: number;
  description?: string;
  active: boolean;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  totalBookings: number;
  createdAt: string;
}

export interface Appointment {
  id: string;
  businessId: string;
  confirmationCode: string; // e.g., "AF-8942-ATEL"
  serviceId: string;
  staffId?: string;
  resourceId?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;     // YYYY-MM-DD
  timeSlot: string; // "10:00"
  endTime: string;  // "11:00"
  status: AppointmentStatus;
  notes?: string;
  price: number;
  attendeesCount: number;
  createdAt: string;
}

export interface StorageSchema {
  version: number;
  activeBusinessId: string;
  businesses: Business[];
  services: Service[];
  staff: Staff[];
  resources: Resource[];
  customers: Customer[];
  appointments: Appointment[];
  lastUpdated: string;
}

export interface RouteState {
  path: string;
  params: Record<string, string>;
  searchParams: URLSearchParams;
}
