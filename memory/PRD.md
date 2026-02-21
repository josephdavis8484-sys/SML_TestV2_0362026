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
  - **Start Time & End Time fields** (NEW - Feb 2026) - Events auto-hide after end time
- Pro Mode for multi-camera streaming ($1000 fee via Stripe)
- **Promo codes for Pro Mode discounts** (NEW - Feb 2026)
- **City/State Geo-fencing** - restrict event access to viewers within 1000m radius (UPDATED - Feb 2026)
  - City and State input fields for event location
  - Nominatim geocoding to convert to lat/lon coordinates
  - "Verify Location" button for coordinate confirmation
- **Cancel event with auto-refund** (NEW - Feb 2026)
- QR codes for camera devices (up to 5)
- Control panel for camera switching, transitions, audio mixing

### 3. Content Viewer Flow
- Home page to browse upcoming events
- **Location Search Feature** - search events by City/State (NEW - Feb 2026)
  - MapPin toggle button opens search panel
  - City input and State dropdown
  - "Showing X events in [location]" indicator
  - Clear search to reset filters
- Event details page with "Buy Ticket" button
- Stripe checkout for ticket purchases
- "Add to Calendar" functionality (mobile-friendly)
- **Watch/Connect button on tickets** (NEW - Feb 2026)
- **Share button for live events** (NEW - Feb 2026)
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
  - **About page management** (NEW - Feb 2026)
    - Edit description, phone, email
    - Social media links (Facebook, Twitter, Instagram, YouTube)
    - Terms of Service URL
    - Privacy Policy URL
  - **Event deletion/cleanup** (NEW - Feb 2026)
    - Delete test events, cancelled events, completed events
    - Warning before permanent deletion

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
- [x] Creator Analytics Dashboard - Revenue trends, charts, top events
- [x] Professional WebRTC Control Panel - Multi-camera interface with audio mixer
- [x] **Live Chat & Reactions** - Creator-controlled audience engagement:
  - Toggle chat/reactions during event setup
  - Chat modes: Open, Questions Only, Moderated
  - Live emoji reactions with floating animations
  - Pin/hide messages for moderation

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
- [x] ~~Plaid integration~~ → **MIGRATED TO STRIPE CONNECT** (Feb 2026)
  - ✅ Stripe Connect Express accounts for creators
  - ✅ Hosted onboarding flow (no bank integration needed)
  - ✅ Direct payouts to creator's Stripe account
  - ✅ Deleted obsolete MockPlaidLink.jsx
  - ✅ Stripe Dashboard link on Creator Settings page
- [x] ~~Real WebRTC Streaming~~ → **FULLY CONFIGURED** with LiveKit Cloud
  - URL: `wss://showmelive-4y2wqa4p.livekit.cloud`
  - Real JWT token generation working
  - Multi-camera streaming ready
  - **LiveStreamViewer component created** (Feb 2026) - Displays real video stream to viewers with tickets
  - Viewers must have purchased ticket to watch live streams
  - `/api/livekit/join-as-viewer` endpoint provides viewer tokens
  - `/api/livekit/start-streaming` endpoint provides creator tokens
  - **Mobile-Friendly Control Panel** (Feb 2026) - Completely redesigned for mobile use
    - Settings button opens fullscreen overlay
    - Each setting (Volume, Mic, Balance, Treble, Bass, Transitions) has its own large overlay
    - Large sliders and buttons optimized for touch input
    - Quick preset buttons (0%, 25%, 50%, 75%, 100%)
- [x] ~~Implement WebSocket for Live Chat~~ → **FULLY IMPLEMENTED** (Feb 2026)
  - WebSocket endpoint: `/api/ws/chat/{event_id}`
  - Real-time message broadcast
  - Real-time reaction broadcast
  - Live viewer count tracking
  - Typing indicators
  - Auto-reconnection with 3-second retry
- [x] ~~Push notifications for live events~~ → **FULLY IMPLEMENTED** (Feb 2026)
  - NotificationBell component in Navbar
  - REST API + WebSocket for real-time notifications
  - Viewers notified when purchased events go live
  - Toast alerts for live event notifications
- [x] ~~Event reminder notifications~~ → **FULLY IMPLEMENTED** (Feb 2026)
  - APScheduler background job runs every 5 minutes
  - Sends notifications 1 hour before event starts
  - Notifies all ticket holders automatically
- [x] ~~Anti-piracy measures~~ → **FULLY IMPLEMENTED** (Feb 2026)
  - AntiPiracy component wraps live event content
  - Disables right-click context menu
  - Blocks screenshot keyboard shortcuts (PrintScreen, Cmd+Shift+3/4/5)
  - Disables text selection on live streams
  - Prevents image/video dragging
  - Detects DevTools opening
  - "LIVE NOW" badge and "Content protected" notice
- [x] ~~City/State Geo-fencing~~ → **FULLY IMPLEMENTED** (Feb 2026)
  - Creator UI: City/State inputs with state dropdown
  - Nominatim (OpenStreetMap) geocoding for coordinates
  - "Verify Location" button shows confirmed coordinates
  - Backend: Haversine formula for distance calculation
  - Default 1000m radius geo-fence
  - Endpoints: `/api/events/{id}/check-geo`, `/api/events/search/location`, `/api/events/locations`
- [x] ~~Viewer Location Search~~ → **FULLY IMPLEMENTED** (Feb 2026)
  - MapPin toggle button on homepage
  - Search panel with City input and State dropdown
  - Real-time filtering shows events in location
  - "Showing X events in [location]" indicator
  - Clear button resets to all events
- [x] ~~Event image upload fix~~ → **FIXED** (Feb 2026)
  - Added `image_url` field to EventCreate model
  - Custom images now saved correctly during event creation
- [x] ~~Expired events filtering~~ → **FIXED** (Feb 2026)
  - Home page `/api/events` filters out past events by date
  - Location search also filters expired events
  - Supports multiple date formats (YYYY-MM-DD, Month DD, YYYY, etc.)
- [ ] Real-time withdrawal status updates (WebSocket)

### P2 (Lower Priority - Future)
- [ ] Coins/Diamond virtual currency system
- [ ] Additional social logins (Facebook, Instagram, Twitter) - Deferred

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

## Recent Changes (Dec 2025 - Feb 2026)
1. Added `/select-role` page for pre-auth role selection
2. Updated Navbar to redirect to role selection instead of direct auth
3. Updated App.js to handle pending_role from sessionStorage
4. Added Stripe checkout to EventDetail page
5. Enhanced CreateEvent with visual Pro Mode selection
6. Added payment flow for Pro Mode ($1000)
7. Creator Onboarding Flow - 3-step wizard (Profile, Bank, Event)
8. ~~Bank Account Linking - Mock Plaid implementation~~ → Replaced with Stripe Connect
9. Payout/Withdrawal System - Balance tracking, withdrawal requests
10. Creator Analytics Dashboard - Revenue trends, charts, top events
11. Professional WebRTC Control Panel - Multi-camera interface with audio mixer
12. Live Chat & Reactions for viewers with creator controls
13. **LiveKit WebRTC Integration** - Full streaming infrastructure ready:
    - Join as creator/viewer endpoints
    - Room management and token generation
    - Stream status tracking with viewer count
    - Camera enumeration and switching
    - Mic/speaker controls with visual levels
14. REMOVED: Multi-image upload (single image per event)
15. **NEW (Feb 2026): Stripe Connect Migration** - Creator payouts now use Stripe Connect:
    - `POST /api/stripe/connect/create-account` - Create Express account
    - `POST /api/stripe/connect/onboarding-link` - Stripe-hosted onboarding
    - `GET /api/stripe/connect/status` - Check account status
    - `POST /api/stripe/connect/payout` - Transfer funds to creator
    - `GET /api/stripe/connect/balance` - Get available balance
    - Frontend CreatorSettings.jsx updated with Stripe Connect UI
    - Deleted obsolete MockPlaidLink.jsx
    - Added Stripe Dashboard link for connected accounts
16. **NEW (Feb 2026): WebSocket Live Chat** - Real-time chat replaces polling:
    - WebSocket endpoint: `/api/ws/chat/{event_id}`
    - Real-time message broadcast to all viewers
    - Real-time reaction broadcast with floating animations
    - Live viewer count tracking and display
    - Typing indicators
    - Auto-reconnection with 3-second retry
    - Ping/pong keepalive for connection health
17. **NEW (Feb 2026): Push Notifications for Live Events** - Viewers notified when events go live:
    - Notification model and database collection
    - REST API endpoints for CRUD operations on notifications
    - WebSocket endpoint `/api/ws/notifications` for real-time push (with REST fallback)
    - NotificationBell component in Navbar with unread badge
    - `POST /api/events/{event_id}/go-live` - Sets event live & notifies ticket holders
    - `POST /api/events/{event_id}/end` - Marks event as completed
    - Toast notifications for live event alerts
    - Notification types: event_live, event_reminder, ticket_purchased, payout_completed
18. **NEW (Feb 2026): Promo Code System for Pro Mode** - Discounts for creator Pro Mode:
    - PromoCode model with fields: code, discount_type (percentage/fixed), discount_value, max_uses, start_date, expiration_date
    - Admin CRUD endpoints:
      - `GET /api/admin/promo-codes` - List all promo codes
      - `POST /api/admin/promo-codes` - Create new promo code
      - `PUT /api/admin/promo-codes/{id}` - Update promo code
      - `DELETE /api/admin/promo-codes/{id}` - Delete promo code
    - User validation endpoints:
      - `POST /api/promo-codes/validate` - Validate and calculate discount
      - `POST /api/promo-codes/apply` - Apply code (increment usage)
    - Admin Dashboard: New "Promo Codes" tab with full CRUD UI
    - CreateEvent page: Promo code input when Pro Mode is selected
    - Discount breakdown showing original price, discount amount, final price
19. **NEW (Feb 2026): Event Reminder Notifications** - Automatic reminders 1 hour before events:
    - APScheduler background job runs every 5 minutes
    - Checks for events starting within the next hour
    - Sends notifications to all ticket holders
    - Prevents duplicate reminders with reminder_flags collection
    - Notification includes event title, image, and direct link
20. **NEW (Feb 2026): Anti-Piracy Measures** - Content protection for live streams:
    - AntiPiracy component (`/app/frontend/src/components/AntiPiracy.jsx`)
    - Wraps EventDetail page content when event status is "live"
    - Disables right-click context menu on live content
    - Blocks screenshot keyboard shortcuts (PrintScreen, Cmd+Shift+3/4/5, Ctrl+P/S/U)
    - Disables text selection on protected content
    - Prevents image and video dragging
    - Detects DevTools opening
    - Visual indicators: "LIVE NOW" badge with pulsing red dot
    - "Content protected • Recording disabled" notice with Shield icon
21. **NEW (Feb 2026): Automatic 24-Hour Payout System** - Money flow automation:
    - **Money Flow**: Customer pays → Stripe fee deducted → Money to Admin account → After 24hrs: 20% stays with Admin, 80% to Creator
    - APScheduler background job runs every hour
    - Checks for tickets purchased 24+ hours ago
    - Automatically transfers 80% to creator's Stripe Connect account
    - 20% platform fee remains in admin's Stripe account
    - Tracks payout status: pending, completed, failed, pending_stripe_setup
    - Sends notification to creator when payout completes
22. **NEW (Feb 2026): Enhanced Admin Event Management**:
    - Event table shows: Event name/image, Creator name/email/picture, Date & Time
    - Revenue breakdown: Total Revenue, Platform Fee (20%), Creator Earnings (80%)
    - Ticket counts: sold and refunded
    - Payout status indicator
    - "Refund All" button to refund all tickets for an event
    - Block/Unblock event functionality
    - `POST /api/admin/events/{event_id}/refund-all` - Refund all tickets for an event
23. **NEW (Feb 2026): Geo-Fencing for Events** - Restrict events by country:
    - Event model extended with: `geo_restricted`, `allowed_countries`, `blocked_countries`
    - Endpoints:
      - `POST /api/events/{event_id}/check-geo?country_code=US` - Check access by country
      - `GET /api/events/{event_id}/geo-settings` - Get geo settings (creator only)
      - `PUT /api/events/{event_id}/geo-settings` - Update geo settings
    - CreateEvent page has Geographic Restrictions section:
      - Enable Geo-Restrictions toggle
      - Allowed Countries selection (15+ countries)
      - Blocked Countries selection
      - Visual feedback on country buttons
24. **NEW (Feb 2026): Creator Event Cancellation** - Cancel events with auto-refund:
    - `POST /api/events/{event_id}/cancel` - Cancels event and refunds all tickets
    - Automatic notifications sent to all ticket holders
    - Event status set to "cancelled" with reason stored
    - Creator Dashboard shows "Cancel Event" button for upcoming events
    - Cancelled events show CANCELLED badge
25. **NEW (Feb 2026): MyTickets Enhancements**:
    - **Watch/View Event Button**: "Watch Now" (live events) or "View Event" (upcoming)
    - **Mobile-Friendly Calendar**: Uses fetch+blob download method
    - **Cancelled/Refunded Display**: Shows REFUNDED overlay, strikethrough on amount
    - Event status badges: LIVE NOW (pulse), Upcoming, Ended, Cancelled
26. **NEW (Feb 2026): Control Panel Redesign** - Simplified Netflix-style live stream interface:
    - **Design**: Full-screen video preview with bottom control bar
    - **Controls**: Camera toggle, Microphone toggle, "End Live" button, "Go Live" button, and Settings
    - **Red mute indicator**: Visual slash on mic icon when muted
    - **On/Off status**: Green/Red indicators under Camera and Mic buttons
    - **Pre-stream preview**: Shows camera preview before going live using `navigator.mediaDevices`
    - **LiveKit integration**: Properly syncs camera/mic state with LiveKit room
    - **Stream Timer**: Shows elapsed time (HH:MM:SS) when streaming
    - **Audio Settings Dropdown (Basic Mode)**: Settings button opens dropdown panel with:
      - Speaker Volume slider with percentage display
      - Microphone Volume slider with percentage display
      - Audio Balance slider (L/R) with center marker and waveform visualization
      - Treble slider with +/- buttons
      - Bass slider with +/- buttons
      - Reset button to restore defaults
    - **Live Chat & Reactions Panel**: When event has chat/reactions enabled AND streaming:
      - Left side: Live Chat messages with usernames and color coding
      - Right side: Floating emoji reactions with bounce animations
      - WebSocket integration for real-time updates
      - Auto-scrolling chat messages
    - **Mobile-friendly**: Touch-optimized controls with responsive layout
28. **NEW (Feb 2026): Viewer Live Stream View** - Simplified viewer experience:
    - **Full-screen video**: Stream takes most of the viewport
    - **Video overlays**:
      - LIVE indicator with viewer count (top-left)
      - Stream timer HH:MM:SS (top-right)
      - Share button with modal (X, Facebook, WhatsApp, Copy Link)
    - **Bottom Control Bar** (only when chat/reactions enabled):
      - Chat input: "Send a message..." placeholder with Send button
      - Reaction buttons: 👍 😄 ❤️ 👏 (clickable to send)
    - **Key behavior**: Viewers can SEND messages/reactions but do NOT see other viewers' messages or reactions - keeps the interface clean and focused on the stream
    - **Share Modal**: Social sharing options when Share button clicked
29. **NEW (Feb 2026): MyTickets Page Redesign** - Clean card-based ticket layout:
    - **Card design**: Blue border, rounded corners, full-width on mobile
    - **Image section**: Event poster with status badge (Upcoming/LIVE/Ended) top-left, quantity badge (x1) top-right
    - **Event details**:
      - Title in bold white
      - Date/time with calendar icon
      - Location with map pin icon (or "Online")
    - **Purchase info**: Purchased date and Amount Paid ($0.00 in green)
    - **Action buttons** (3 stacked):
      - "View Event" (green with arrow icon)
      - "Add to Calendar" (blue with calendar icon)
      - "Share This Show" (outlined with share icon)
    - **Share Modal**: Social sharing popup (X, Facebook, WhatsApp, Copy Link)
27. **NEW (Feb 2026): Questions Only Default** - CreateEvent form updates:
    - "Live Chat" renamed to "Questions Only" with HelpCircle icon
    - `chat_enabled: true` by default for new events
    - `chat_mode: "questions_only"` as default selection
    - Aligns with user request for educational content focus

---

## Pending Issues (as of Feb 2026)

### P0 - Critical
- **Script error on CreateEvent toggles**: Intermittent error when toggling switches. May be browser-specific or React state race condition. Needs debugging with console logs.

### P1 - Medium
- None currently identified

---

## Next Steps
1. User to test the new Control Panel layout via Google OAuth login
2. Test microphone functionality during live stream
3. Verify "Questions Only" default works as expected
4. Debug the intermittent Script error on CreateEvent page if reproducible

