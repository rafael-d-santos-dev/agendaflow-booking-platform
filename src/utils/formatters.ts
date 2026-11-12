/**
 * AgendaFlow — Formatting and Presentation Utilities
 * Editorial dates, currencies, and status helpers
 */

import { AppointmentStatus } from '../types/index.ts';

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString('en-US')}`;
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${hours} hr ${remaining} min`;
}

export function formatEditorialDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getStatusTheme(status: AppointmentStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Confirmed',
        badgeClass: 'bg-[#B58A55]/15 text-[#30251E] border border-[#B58A55]/40 font-medium',
      };
    case 'pending':
      return {
        label: 'Pending Review',
        badgeClass: 'bg-[#D8C3A5]/30 text-[#4A3B31] border border-[#D8C3A5] font-normal',
      };
    case 'completed':
      return {
        label: 'Completed',
        badgeClass: 'bg-[#465945]/15 text-[#30251E] border border-[#465945]/30 font-medium',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        badgeClass: 'bg-[#8C4336]/10 text-[#8C4336] border border-[#8C4336]/30 font-normal',
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-[#D8C3A5]/20 text-[#30251E] border border-[#D8C3A5]',
      };
  }
}

export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1Str = typeof date1 === 'string' ? date1 : formatDateToISO(date1);
  const d2Str = typeof date2 === 'string' ? date2 : formatDateToISO(date2);
  return d1Str === d2Str;
}

export function getWeekDates(baseDate: Date): Date[] {
  const current = new Date(baseDate);
  const day = current.getDay();
  // Adjust to Monday as start of week (0 = Sunday, 1 = Monday)
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(current.setDate(diff));

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDate = new Date(monday);
    nextDate.setDate(monday.getDate() + i);
    week.push(nextDate);
  }
  return week;
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatDayHeader(date: Date): { dayName: string; dayNumber: number } {
  return {
    dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNumber: date.getDate(),
  };
}
