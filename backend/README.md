# ShowMeLive Backend

Virtual event platform backend with live streaming, payments, and multi-camera support.

## Architecture

```
/app/backend/
├── server.py              # Main FastAPI application (being refactored)
├── server_backup.py       # Backup of original server.py
├── config.py              # Configuration settings
├── database.py            # MongoDB connection
├── requirements.txt       # Python dependencies
│
├── models/                # Pydantic data models
│   ├── __init__.py
│   ├── user.py           # User, UserSession, RoleSelection
│   ├── event.py          # Event, EventCreate, StreamingDevice
│   ├── ticket.py         # Ticket, TicketCreate
│   ├── payment.py        # PaymentTransaction, PromoCode models
│   ├── notification.py   # Notification models
│   ├── pro_mode.py       # ProModeDevice, ProModeSession
│   └── security.py       # SecurityEvent, SecurityViolation
│
├── services/              # Business logic managers
│   ├── __init__.py
│   ├── chat_manager.py           # WebSocket chat management
│   ├── notification_manager.py   # Real-time notifications
│   └── pro_mode_manager.py       # Multi-camera streaming
│
├── utils/                 # Helper utilities
│   ├── __init__.py
│   ├── auth.py           # Authentication helpers
│   └── geo.py            # Geolocation calculations
│
└── tests/                 # Test files
```

## API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth callback
- `POST /api/auth/set-role` - Set user role (viewer/creator)
- `POST /api/admin/login` - Admin login
- `GET /api/auth/user` - Get current user

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event (creator only)
- `GET /api/events/{event_id}` - Get event details
- `PUT /api/events/{event_id}` - Update event
- `DELETE /api/events/creator/{event_id}` - Delete event (creator only)
- `POST /api/events/{event_id}/cancel` - Cancel event

### Tickets
- `POST /api/tickets/checkout` - Purchase ticket
- `GET /api/tickets/user` - Get user's tickets
- `DELETE /api/tickets/{ticket_id}` - Delete ticket

### Streaming
- `GET /api/streaming/token/{event_id}` - Get LiveKit token (creator)
- `GET /api/streaming/viewer-token/{event_id}` - Get viewer token

### Pro Mode (Multi-Camera)
- `POST /api/pro-mode/session/create` - Start Pro Mode session
- `GET /api/pro-mode/session/{event_id}` - Get session details
- `POST /api/pro-mode/device/register-public` - Register camera device
- `POST /api/pro-mode/control-panel/connect` - Connect control panel
- `POST /api/pro-mode/switch-device` - Switch active camera

### Security
- `POST /api/security/report-capture` - Report screenshot/recording attempt
- `GET /api/security/check-status` - Check user's violation status
- `GET /api/security/violations/{user_id}` - Admin: View violations
- `POST /api/security/lift-suspension/{user_id}` - Admin: Lift suspension

### Payments
- `POST /api/pro-mode/unlock/checkout` - Unlock Pro Mode ($1000)
- `GET /api/payments/checkout/status/{session_id}` - Check payment status

### WebSocket Endpoints
- `WS /api/ws/chat/{event_id}` - Live chat
- `WS /api/ws/notifications/{user_id}` - Real-time notifications
- `WS /api/ws/pro-mode/{event_id}/{device_type}` - Pro Mode device connection

## Environment Variables

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=showmelive
CORS_ORIGINS=*

ADMIN_EMAIL=admin@showmelive.com
ADMIN_PASSWORD=admin123

STRIPE_API_KEY=sk_test_...
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

## Running

```bash
# Development (with hot reload)
sudo supervisorctl restart backend

# Check logs
tail -f /var/log/supervisor/backend.err.log
```

## Migration Status

The codebase is being refactored from a monolithic `server.py` to a modular structure.

### Completed
- [x] Created modular structure (models/, services/, utils/)
- [x] Extracted Pydantic models to separate files
- [x] Extracted service managers (Chat, Notification, Pro Mode)
- [x] Created utility modules (auth, geo)
- [x] Added configuration module

### In Progress
- [ ] Update server.py to import from modules
- [ ] Extract route handlers to routes/ directory
- [ ] Add comprehensive tests

### Future
- [ ] Add API versioning
- [ ] Add request/response caching
- [ ] Add rate limiting
