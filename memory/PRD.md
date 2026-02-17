# ShowMeLive - Virtual Event Platform PRD

## Original Problem Statement
Build a virtual event platform (ShowMeLive) with a clean, modern Netflix-inspired design. The platform should support:
- Role-based access for Content Creators and Content Viewers
- Social login (Google) with role selection
- Event creation and management for creators
- Ticket purchasing for viewers
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

#### Authentication
- [x] Google OAuth integration via Emergent Auth
- [x] Post-authentication role selection (Viewer/Creator)
- [x] Session management with cookies
- [x] Admin email/password authentication

#### Public Features
- [x] Public event browsing (no login required)
- [x] Event details page
- [x] "Add to Calendar" (.ics file download)

#### Creator Features
- [x] Creator Dashboard skeleton
- [x] Event creation form
- [x] QR code generation for events
- [x] Streaming device token generation

#### Admin Panel (COMPLETED)
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
- [x] Stripe payment integration (backend)
- [x] Event seeding script

### Default Admin Credentials
- Email: `admin@showmelive.com`
- Password: `admin123`

---

## Prioritized Backlog

### P0 (High Priority)
- [ ] **Fix Sign-in/Role Selection Flow**: User wants role selection BEFORE Google sign-in (not after)
- [ ] **Creator Dashboard Features**: Full event creation with image upload, Pro Mode selection

### P1 (Medium Priority)
- [ ] Stripe integration for ticket purchases (frontend)
- [ ] Stripe integration for Pro Mode ($1000 fee)
- [ ] Plaid integration for creator bank account linking

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
- **Payments**: Stripe (partially integrated)
- **Calendar**: iCalendar library

---

## Key Files Reference
- `/app/backend/server.py` - All backend routes and logic
- `/app/frontend/src/App.js` - Main router and auth state
- `/app/frontend/src/pages/AdminDashboard.jsx` - Admin panel
- `/app/frontend/src/pages/AdminLogin.jsx` - Admin login
- `/app/frontend/src/pages/Home.jsx` - Public homepage
- `/app/frontend/src/pages/CreatorDashboard.jsx` - Creator view

---

## Known Issues
1. Sign-in flow: Currently role selection happens AFTER auth, user wants BEFORE
2. Duplicate users showing in admin panel (same email, different IDs)
