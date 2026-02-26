"""Routes package for ShowMeLive API"""

# This package contains all API route handlers organized by feature.
# Routes are imported and included in the main server.py application.

# Available route modules:
# - auth.py: Authentication routes (Google OAuth, session management)
# - events.py: Event CRUD operations
# - tickets.py: Ticket purchase and management
# - streaming.py: LiveKit streaming tokens
# - chat.py: Live chat and reactions
# - payments.py: Stripe payments and checkout
# - admin.py: Admin dashboard and management
# - creator.py: Creator-specific routes
# - pro_mode.py: Multi-camera Pro Mode
# - security.py: Privacy protection and violations
# - notifications.py: Real-time notifications
# - stripe_connect.py: Creator payouts

__all__ = [
    'auth_router',
    'events_router', 
    'tickets_router',
    'streaming_router',
    'chat_router',
    'payments_router',
    'admin_router',
    'creator_router',
    'pro_mode_router',
    'security_router',
    'notifications_router',
    'stripe_connect_router'
]
