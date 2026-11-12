# AgendaFlow — Multi-Industry Booking Platform

A multi-industry appointment booking platform demo built with **React, TypeScript, and Vite**.

AgendaFlow is a portfolio project designed to demonstrate frontend engineering, interface design, scheduling logic, data management, and customer booking workflows across different business industries.

**Live Demo:** https://agendaflow-editorial-luxury-scheduling-platform.ai.studio

---

## Overview

AgendaFlow provides two independent interfaces:

- **Admin Dashboard:** Manage appointments, services, staff, customers, business settings, and scheduling operations.
- **Customer Booking Portal:** A guided booking experience that allows customers to select services, staff, dates, and available time slots.

The platform includes five configurable business environments, each with its own data and operational settings.

## Supported Industries

| Business | Industry |
|---|---|
| Atelier Grooming & Hair Spa | Salon & Beauty |
| Aura Integrative Wellness | Wellness & Clinic |
| Vanguard Strategic Advisory | Consulting |
| Kinetic Performance Lab | Fitness |
| Monolith Daylight Studios | Studio Rentals |

All businesses and customer records are fictional demonstration data.

## Key Features

### Customer Booking Portal

- Seven-step guided booking workflow.
- Business-specific services and staff.
- Dynamic availability and time-slot selection.
- Scheduling policy validation.
- Booking confirmation with a unique reference code.
- Customer information validation.
- Prevention of duplicate customer records.
- Booking cancellation and availability updates.

### Admin Dashboard

- Overview dashboard.
- Calendar with day and week views.
- Appointment management.
- Service and pricing management.
- Team and staff management.
- Customer CRM.
- Business settings and scheduling policies.

### Scheduling & Data Integrity

- Business-specific data isolation.
- Business operating hours and closures.
- Staff availability and breaks.
- Booking lead-time restrictions.
- Service duration and buffer handling.
- Resource and group-capacity validation.
- Availability revalidation before booking confirmation.
- Customer and appointment data persistence using browser localStorage.

## Technology Stack

| Technology | Purpose |
|---|---|
| React 19 | User interface |
| TypeScript | Static typing |
| Vite | Development and build tooling |
| Tailwind CSS v4 | Styling |
| Motion | Interface animations |
| Lucide React | Icons |
| Browser localStorage | Local data persistence |

## Design System

AgendaFlow uses an **Editorial Luxury** visual direction.

The interface combines:

- Editorial typography using Playfair Display and Plus Jakarta Sans.
- Warm ivory, sand, taupe, espresso, and restrained gold tones.
- Spacious layouts and refined visual hierarchy.
- Responsive layouts for mobile, tablet, and desktop.
- Separate visual approaches for administrative operations and customer booking.

## Project Architecture

The following is a simplified overview of the main source structure:

```text
src/
├── components/
│   ├── admin/
│   │   ├── OverviewView.tsx
│   │   ├── CalendarView.tsx
│   │   ├── AppointmentsLedgerView.tsx
│   │   ├── ServicesManagerView.tsx
│   │   ├── TeamManagerView.tsx
│   │   ├── CustomersManagerView.tsx
│   │   └── BusinessSettingsView.tsx
│   ├── customer/
│   │   └── CustomerBookingWizard.tsx
│   └── common/
├── utils/
│   ├── storage.ts
│   ├── availability.ts
│   ├── formatters.ts
│   └── router.ts
├── types/
│   └── index.ts
└── App.tsx
```

This tree highlights representative files and does not list every component or supporting file.

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/rafael-d-santos-dev/agendaflow-booking-platform.git
```

2. Navigate to the project directory:

```bash
cd agendaflow-booking-platform
```

3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open the local URL provided by Vite in your browser.

### Production Build

To generate a production build:

```bash
npm run build
```

### Type Checking

Run the project's configured validation command:

```bash
npm run lint
```

**Note:** The current `lint` script runs TypeScript type checking (`tsc --noEmit`). It does not represent a separate ESLint analysis.

## Data Persistence

AgendaFlow currently uses browser `localStorage` for demonstration purposes.

This means:

- Data is stored locally in the browser.
- Different browsers and devices do not share data.
- Clearing browser storage may remove saved demonstration data.
- The application does not use a cloud database or remote persistence service.

## Scope & Limitations

AgendaFlow is a frontend portfolio demonstration, not a production-ready booking service.

The current implementation does not include:

- Backend infrastructure or API services.
- Real user authentication or authorization.
- Cloud database integration.
- Online payments.
- Real email or SMS notifications.
- Push notifications.
- Multi-device synchronization.
- Production-grade server-side transaction handling.

All business profiles, appointments, customers, and operational information are fictional.

## Quality & Validation

The project development environment reported the following validation results:

- TypeScript checks: PASS.
- Production build: PASS.
- Automated test assertions: 66 reported.
- Five business environments included in validation scenarios.
- Booking availability revalidation and customer-data collision scenarios covered.

These results reflect development-environment reports and are not an independent third-party certification or production security audit.

## Project Goals

This project was developed to demonstrate practical skills in:

- React and TypeScript application architecture.
- Responsive interface development.
- Complex multi-step user workflows.
- Scheduling and availability logic.
- State management and browser persistence.
- Data validation and business-rule implementation.
- Multi-industry product configuration.
- UI/UX design and frontend quality practices.

## Author

**Rafael Douglas**

Freelance Web Designer & Developer

- GitHub: https://github.com/rafael-d-santos-dev

---

*AgendaFlow — A multi-industry booking platform demonstration built as part of a frontend development portfolio.*
