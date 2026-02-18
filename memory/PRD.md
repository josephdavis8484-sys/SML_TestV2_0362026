# ShowMeLive - Virtual Event Platform PRD

## Original Problem Statement
Build a virtual event platform (ShowMeLive) with a clean, modern Netflix-inspired design. The platform should support:
- Role-based access for Content Creators and Content Viewers
- Social login (Google) with role selection BEFORE authentication
- Event creation and management for creators
- Ticket purchasing for viewers via Stripe
- Admin panel for platform management

## User's Preferred Language
English

## Core Requirements

### 1. Role-Based Access
- **Content Creator**: Must login, accept Content Guidelines & 20% platform fee
- **Content Viewer**: Optional login (guest access for browsing)
- **Admin**: Separate login path at `/admin/login`

### 2. Content Creator Flow
- Dashboard with "Schedule New Show" button
- Event creation form (Category, Title, Date/Time, Price, Poster)
- Pro Mode for multi-camera streaming ($1000 fee via Stripe)
- QR codes for camera devices (up to 5)
- Control panel for camera switching, transitions, audio mixing

### 3. Content Viewer Flow
- Home page to browse upcoming events
- Event details page with "Buy Ticket" button
- Stripe checkout for ticket purchases
- "Add to Calendar" functionality

### 4. Admin Panel
- User management (approve/reject creators, block/unblock users)
- Event monitoring and management
- Payment oversight and refund handling
- Platform analytics

### 5. Security & Monetization
- 20% platform fee on ticket sales
- 24-hour payout delay for creators
- Stripe integration for payments

---

## What's Been Implemented

### Completed (as of Dec 2025)

#### UI/UX
- [x] Netflix-inspired dark theme (blue/black/white color scheme)
- [x] Responsive design for all screen sizes
- [x] Dynamic homepage with event banner carousel
- [x] Event cards with neon glow hover effects

#### Authentication & Role Selection (UPDATED)
- [x] Google OAuth integration via Emergent Auth
- [x] **Pre-authentication role selection** at `/select-role`
- [x] User picks Viewer or Creator BEFORE Google sign-in
- [x] Role stored in sessionStorage and applied after auth
- [x] Session management with cookies
- [x] Admin email/password authentication

#### Public Features
- [x] Public event browsing (no login required)
- [x] Event details page with time display
- [x] "Add to Calendar" (.ics file download)

#### Stripe Integration (NEW)
- [x] Stripe checkout for ticket purchases
- [x] "Pay $X" button on event detail page
- [x] Free event handling ("Claim Free Tickets" button)
- [x] Pro Mode payment ($1000) for creators
- [x] Payment success/cancel pages

#### Creator Features
- [x] Creator Dashboard with earnings overview
- [x] Event creation form with image upload
- [x] Basic (Free) streaming package
- [x] Premium ($1000) Pro Mode package
- [x] Visual package selection with checkmarks
- [x] Pro Mode warning message
- [x] Creator Onboarding Flow - 3-step wizard
- [x] Payout Settings Page - `/creator/settings`
- [x] Bank Account Linking - Mock Plaid (demo)
- [x] Withdrawal/Payout System - Balance & history
- [x] **Creator Analytics Dashboard** - Revenue trends, charts, top events
- [x] **Professional WebRTC Control Panel** - Multi-camera interface with audio mixer

#### Admin Panel
- [x] Admin Login page at `/admin/login`
- [x] Admin Dashboard with tabs:
  - Overview (user/event/ticket/revenue stats)
  - Users (list, block/unblock)
  - Events (list, status, block)
  - Tickets (list, refund)
  - Live (live event monitoring)
  - Bank (platform bank info)
- [x] All admin API endpoints functional
- [x] Admin session management with localStorage

#### Backend Infrastructure
- [x] FastAPI server with all routes
- [x] MongoDB database integration
- [x] Stripe payment integration
- [x] Event seeding script

### Default Admin Credentials
- Email: `admin@showmelive.com`
- Password: `admin123`

---

## Prioritized Backlog

### P0 (High Priority)
- [x] ~~Fix Sign-in/Role Selection Flow~~ ✅ COMPLETED
- [x] ~~Stripe Frontend~~ ✅ COMPLETED
- [x] ~~Creator Pro Mode payment~~ ✅ COMPLETED

### P1 (Medium Priority)
- [ ] Full Plaid integration (requires API keys)
- [ ] Event image gallery UI on frontend
- [ ] Real-time withdrawal status updates

### P2 (Lower Priority - Future)
- [ ] Multi-camera streaming control panel (WebRTC)
- [ ] Anti-piracy measures (screen recording prevention)
- [ ] Coins/Diamond virtual currency system
- [ ] Social logins (Facebook, Instagram, Twitter)

---

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **Auth**: Google OAuth 2.0 (Emergent Auth), JWT for Admin
- **Payments**: Stripe (fully integrated)
- **Calendar**: iCalendar library

---

## Key Files Reference
- `/app/backend/server.py` - All backend routes and logic
- `/app/frontend/src/App.js` - Main router and auth state
- `/app/frontend/src/pages/SelectRole.jsx` - Pre-auth role selection (NEW)
- `/app/frontend/src/pages/AdminDashboard.jsx` - Admin panel
- `/app/frontend/src/pages/AdminLogin.jsx` - Admin login
- `/app/frontend/src/pages/EventDetail.jsx` - Event detail with Stripe checkout
- `/app/frontend/src/pages/CreateEvent.jsx` - Event creation with Pro Mode
- `/app/frontend/src/pages/Home.jsx` - Public homepage
- `/app/frontend/src/pages/CreatorDashboard.jsx` - Creator view

---

## Recent Changes (Dec 2025)
1. Added `/select-role` page for pre-auth role selection
2. Updated Navbar to redirect to role selection instead of direct auth
3. Updated App.js to handle pending_role from sessionStorage
4. Added Stripe checkout to EventDetail page
5. Enhanced CreateEvent with visual Pro Mode selection
6. Added payment flow for Pro Mode ($1000)
7. Creator Onboarding Flow - 3-step wizard (Profile, Bank, Event)
8. Bank Account Linking - Mock Plaid implementation
9. Payout/Withdrawal System - Balance tracking, withdrawal requests
10. **NEW: Creator Analytics Dashboard** - Revenue trends, category breakdown, top events
11. **NEW: Professional WebRTC Control Panel** - Multi-camera interface with:
    - Camera switching grid (5 cameras for Premium)
    - Audio mixer (Mic volume, Speaker, Treble, Bass)
    - Video transitions (Cut, Fade, Crossfade)
    - Camera preview sidebar
    - Live stream indicator
12. **REMOVED: Multi-image upload** - Single image per event
