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
  - **Start Time & End Time fields** - Events auto-hide after end time
- Pro Mode for multi-camera streaming ($1000 fee via Stripe)
- **Promo codes for Pro Mode discounts**
- **City/State Geo-fencing** - restrict event access to viewers within 1000m radius
  - City and State input fields for event location
  - Nominatim geocoding to convert to lat/lon coordinates
  - "Verify Location" button for coordinate confirmation
- **Cancel event with auto-refund**
- QR codes for camera devices (up to 5)
- Control panel for camera switching, transitions, audio mixing

### 3. Content Viewer Flow
- Home page to browse upcoming events
- **Location Search Feature** - search events by City/State
  - MapPin toggle button opens search panel
  - City input and State dropdown
  - "Showing X events in [location]" indicator
  - Clear search to reset filters
- Event details page with "Buy Ticket" button
- Stripe checkout for ticket purchases
- "Add to Calendar" functionality (mobile-friendly)
- **Watch/Connect button on tickets**
- **Share button for live events**
  - When watching live stream, viewers see "Share This Show" button
  - Social sharing: X (Twitter), Facebook, WhatsApp
  - Copy link to clipboard option
- Geo-access check before ticket purchase (radius-based)

### 4. Admin Role & Panel
- Separate login path (`/admin/login`)
- Dashboard with:
  - User management (block/unblock)
  - Event management with financial breakdowns
  - Promo code management
  - Bank info management
  - **About page management**
    - Edit description, phone, email
    - Social media links (Facebook, Twitter, Instagram, YouTube)
    - Terms of Service URL
    - Privacy Policy URL
  - **Event deletion/cleanup**
    - Delete test events, cancelled events, completed events
    - Warning before permanent deletion

### 5. Security & Monetization
- 20% platform fee on ticket sales
- 24-hour payout delay for creators
- Stripe integration for payments

---

## What's Been Implemented

### Completed (as of Feb 2026)

#### UI/UX
- [x] Netflix-inspired dark theme (blue/black/white color scheme)
- [x] Responsive design for all screen sizes
- [x] Dynamic homepage with event banner carousel
- [x] Event cards with neon glow hover effects

#### Authentication & Role Selection
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

#### Stripe Integration
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
- [x] Bank Account Linking via Stripe Connect
- [x] Withdrawal/Payout System - Balance & history
- [x] Creator Analytics Dashboard - Revenue trends, charts, top events
- [x] Professional WebRTC Control Panel - Multi-camera interface with audio mixer
- [x] **Live Chat & Reactions** ✅ FULLY WORKING (Feb 22, 2026)
  - Toggle chat/reactions during event setup
  - Chat modes: Open, Questions Only, Moderated
  - Live emoji reactions with floating animations
  - Real-time WebSocket broadcast to all connected clients
  - Creator receives messages/reactions instantly when connected

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

## Recent Fixes (Feb 26, 2026)

### ✅ Pro Mode (Multi-Camera Streaming) - COMPLETED
**Feature**: Multi-camera streaming with up to 5 devices for professional live broadcasts.

**Implementation**:
1. **QR Code Connection System** - Creators generate QR codes that devices scan to connect
2. **Public Device Registration** - Devices connect using a secure `connection_token` without requiring full authentication
3. **Control Panel** - Real-time view of all connected cameras with switching capability
4. **Transition Effects** - Cut, Fade, Dissolve, and Blend transitions between cameras
5. **Audio Management** - Balance, Treble, and Bass controls per device

**Files Updated**:
- `/app/backend/server.py` - Added Pro Mode session, device registration (public endpoint), control panel connect, device switching, transition APIs
- `/app/frontend/src/pages/ProModeControlPanel.jsx` - Main control panel UI with LiveKit integration
- `/app/frontend/src/pages/ProModeQRCodes.jsx` - QR code generation with connection tokens
- `/app/frontend/src/pages/ProModeCameraDevice.jsx` - Camera device connection page
- `/app/frontend/src/App.js` - Added routes for Pro Mode pages

**API Endpoints**:
- `POST /api/pro-mode/session/create` - Create Pro Mode session (requires premium package)
- `GET /api/pro-mode/session/{event_id}` - Get session details
- `POST /api/pro-mode/device/register-public` - Public device registration with token
- `POST /api/pro-mode/control-panel/connect` - Connect control panel to LiveKit
- `POST /api/pro-mode/switch-device` - Switch active camera with transition
- `PUT /api/pro-mode/session/{event_id}/transition` - Update default transition type
- `POST /api/pro-mode/go-live/{event_id}` - Start live streaming

**Verification**: Testing agent confirmed all 18 backend tests + frontend tests pass with 100% success rate.

### ✅ Live Chat & Live Reactions UI Redesign - COMPLETED
**Feature**: Modern, flashy design for Live Chat and Live Reactions with gradient overlays and motion animations.

**Implementation**:
1. **Gradient Overlays** - Both chat and reactions have gradient fade (bottom opacity 0.38 → top 0)
2. **Chat Timing** - Messages display for 6s total (3s hold + 3s fade)
3. **Reaction Timing** - Reactions animate for 2.0s with motion effects
4. **Motion Animations**:
   - **Clapping Hands (👏, 🙌)** - Bounce and shake animation
   - **Laughing Faces (😂, 🤣, 😆)** - Wobble and bounce animation  
   - **Pumping Hearts (❤️, 💖, 💕, 😍)** - Pulse and float with glow effect
5. **Visual Enhancements**:
   - Glow backgrounds that pulse with reaction colors
   - Drop shadow effects on emojis
   - Modern chat bubbles with backdrop blur
   - Smooth entrance animations for chat messages

**Files Updated**:
- `/app/frontend/src/pages/ControlPanel.jsx` - Updated FloatingChatOverlay, FloatingReactionsOverlay components with new CSS animations
- `/app/frontend/src/components/LiveStreamViewer.jsx` - Updated reaction buttons (👏, 😂, ❤️, 🔥, 😍)

### ✅ Pro Mode Fee (Stripe Payment) - COMPLETED
**Feature**: Creators must pay $1000 to unlock Pro Mode for their events.

**Implementation**:
1. **Backend**: New endpoint `/api/pro-mode/unlock/checkout` creates Stripe checkout session
2. **Promo Code Support**: Applies percentage or fixed discounts (e.g., PROMODE50 = 50% off)
3. **100% Discount Handling**: Automatically unlocks Pro Mode without Stripe redirect
4. **Payment Status Handling**: Updated `/api/payments/checkout/status/{session_id}` to handle `pro_mode_unlock` type
5. **Creator Dashboard UI**: 
   - Free events show "Stream" + "Pro Mode $1000" buttons
   - Clicking "Pro Mode $1000" reveals promo code input panel
   - Premium events show "Pro Mode" button directly

**API Endpoint**:
- `POST /api/pro-mode/unlock/checkout` - Creates Stripe checkout for $1000 (or discounted)
  - Parameters: `event_id` (required), `origin_url` (required), `promo_code` (optional)
  - Returns: `url`, `session_id`, `amount`, `discount`, `discount_description`

**Verification**: Testing agent confirmed all 12 backend tests + frontend tests pass with 100% success rate.

### ✅ Privacy Protection (Screen Capture Prevention) - COMPLETED
**Feature**: Prevent screenshots and screen recording during live streams with escalating enforcement.

**Protection Response**:
1. **Content Hidden**: Video frames replaced with black/blur, audio muted
2. **Warning Overlay**: Shows message "Screen capture is not allowed on ShowMeLive."
3. **Security Event Logged**: Records timestamp, user_id, event_id, device_id, capture_type, OS, browser, app_version, session_id
4. **Escalating Enforcement**:
   - 1-2 violations: Warn + continue after user stops
   - 3-4 violations: End session
   - 5+ violations: 30-day suspension
   - Violation after suspension: Permanent account restriction

**Detection Methods**:
- PrintScreen key (Windows)
- Cmd+Shift+3/4/5 (macOS)
- Win+Shift+S (Windows Snipping Tool)
- getDisplayMedia API (screen sharing)
- Visibility change (tab hidden)
- Print command (Ctrl+P)

**Backend API Endpoints**:
- `POST /api/security/report-capture` - Log capture attempt and get enforcement action
- `GET /api/security/check-status` - Check user's violation/suspension status
- `GET /api/security/violations/{user_id}` - Admin: View user violations
- `POST /api/security/lift-suspension/{user_id}` - Admin: Lift user suspension

**Frontend Components**:
- `useScreenProtection` hook - Detects capture attempts
- `ScreenProtectionOverlay` - Warning overlay with severity levels
- `ProtectedContent` - Wrapper that blurs content when protected

**Files Created/Updated**:
- `/app/backend/server.py` - Security endpoints and models
- `/app/frontend/src/hooks/useScreenProtection.js` - Detection hook
- `/app/frontend/src/components/ScreenProtectionOverlay.jsx` - Warning UI
- `/app/frontend/src/components/LiveStreamViewer.jsx` - Integration
- `/app/frontend/src/pages/ControlPanel.jsx` - Integration

**Verification**: Testing agent confirmed all 16 backend tests + frontend tests pass with 100% success rate.

---

## Recent Fixes (Feb 22, 2026)

### ✅ Live Chat & Live Reactions - FIXED
**Issue**: Viewers could send messages/reactions but creators didn't receive them.

**Root Cause**: The creator's WebSocket only connected when streaming started, creating a timing gap.

**Fix Applied**:
1. Creator WebSocket now connects when event loads (not just when streaming)
2. Added detailed logging throughout the WebSocket flow
3. Backend `broadcast_to_event` now logs all broadcast attempts with connection counts
4. Both frontend components have enhanced error handling and status indicators

**Verification**: Testing agent confirmed all 8 backend tests pass with 100% success rate:
- ✅ Viewer can connect to WebSocket
- ✅ Creator can connect to WebSocket  
- ✅ Viewer sends message → Creator receives it
- ✅ Viewer sends reaction → Creator receives it
- ✅ Viewer count updates work
- ✅ Connection confirmation works

---

## Pending Issues

### P1 - "Script error" on CreateEvent Page
- **Status**: Investigated but not reproducible
- **Analysis**: The generic "Script error" is typically caused by CORS issues with cross-origin scripts. The actual toggle functionality works correctly (uses shadcn/radix-ui Switch component with proper `onCheckedChange` handlers).
- **Recommendation**: If user can reproduce, collect browser console details for specific error message.

---

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, Python, APScheduler
- **Database**: MongoDB
- **Auth**: Google OAuth 2.0 (Emergent Auth), JWT for Admin
- **Payments**: Stripe (fully integrated), Stripe Connect (creator payouts)
- **Streaming**: LiveKit (WebRTC)
- **Real-time**: WebSocket (live chat, notifications)
- **Calendar**: iCalendar library

---

## Key Files Reference
- `/app/backend/server.py` - All backend routes, WebSocket at line 2185
- `/app/frontend/src/App.js` - Main router and auth state
- `/app/frontend/src/pages/ControlPanel.jsx` - Creator streaming UI with chat/reactions panel
- `/app/frontend/src/components/LiveStreamViewer.jsx` - Viewer streaming UI with chat input
- `/app/frontend/src/pages/CreateEvent.jsx` - Event creation with Pro Mode
- `/app/frontend/src/pages/Home.jsx` - Public homepage

---

## Prioritized Backlog

### P0 (High Priority) - All Completed ✅
- [x] ~~Fix Live Chat/Reactions~~ ✅ COMPLETED Feb 22, 2026

### P1 (Medium Priority)
- [ ] Verify Control Panel Settings Functionality (volume, video transitions)
- [ ] Test all new UI components end-to-end

### P2 (Lower Priority - Future)
- [x] ~~Pro Mode for multi-camera streaming~~ ✅ COMPLETED Feb 26, 2026
- [x] ~~Pro Mode Fee - Implement Stripe payment ($1000) before enabling Pro Mode~~ ✅ COMPLETED Feb 26, 2026
- [x] ~~Privacy Protection - Prevent screenshots/recording with escalation~~ ✅ COMPLETED Feb 26, 2026
- [x] ~~Refactor `server.py` into separate modules~~ ✅ COMPLETED Feb 26, 2026 (Phase 1 - Models, Services, Utils)
- [ ] Additional social logins (Facebook, Instagram, Twitter/X)
- [ ] Coins/Diamond virtual currency system

---

## Refactoring Progress (Feb 26, 2026)

### Phase 1 - Module Structure (COMPLETED)
Created modular architecture:
```
/app/backend/
├── config.py          # Configuration settings
├── database.py        # MongoDB connection
├── models/            # Pydantic models (user, event, ticket, payment, notification, pro_mode, security)
├── services/          # Business logic (chat_manager, notification_manager, pro_mode_manager)
├── utils/             # Helpers (auth, geo)
└── README.md          # Documentation
```

### Phase 2 - Route Migration (PENDING)
- [ ] Extract auth routes to routes/auth.py
- [ ] Extract event routes to routes/events.py
- [ ] Extract ticket routes to routes/tickets.py
- [ ] Extract payment routes to routes/payments.py
- [ ] Extract admin routes to routes/admin.py
- [ ] Extract streaming routes to routes/streaming.py
- [ ] Extract pro_mode routes to routes/pro_mode.py
- [ ] Extract security routes to routes/security.py

---

## Next Steps
1. Continue Phase 2 - Extract route handlers to separate files
2. Add unit tests for models and services
3. Consider API versioning for future compatibility
