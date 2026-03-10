# ShowMeLive MongoDB Schema

## Overview
This document describes the MongoDB collections and their schemas for the ShowMeLive platform.

---

## Collections

### 1. users
Stores user account information.

```javascript
{
  id: String,              // UUID - Primary key
  email: String,           // Unique, indexed
  name: String,
  picture: String,         // Profile image URL
  role: String,            // "viewer" | "creator" | "admin" | null
  stripe_account_id: String, // For creator payouts
  bank_linked: Boolean,
  onboarding_completed: Boolean,
  is_blocked: Boolean,
  block_reason: String,
  blocked_at: String,      // ISO date
  created_at: String       // ISO date
}
```

### 2. user_sessions
Active user sessions for authentication.

```javascript
{
  user_id: String,         // References users.id
  session_token: String,   // Unique, indexed
  expires_at: String,      // ISO date - TTL index
  created_at: String
}
```

### 3. events
Event/show listings created by creators.

```javascript
{
  id: String,              // UUID - Primary key
  creator_id: String,      // References users.id
  title: String,
  category: String,        // "Concert", "Comedy", "Sports", etc.
  date: String,            // Date string
  start_time: String,
  end_time: String,
  time: String,            // Legacy field
  description: String,
  venue: String,
  city: String,
  state: String,
  country: String,         // Default: "US"
  latitude: Number,        // For geo-fencing
  longitude: Number,
  price: Number,           // Ticket price in USD
  image_url: String,       // Event poster/banner
  streaming_package: String, // "free" | "premium"
  chat_enabled: Boolean,
  reactions_enabled: Boolean,
  chat_mode: String,       // "open" | "moderated"
  geo_restricted: Boolean,
  geo_radius_meters: Number,
  status: String,          // "upcoming" | "live" | "completed" | "cancelled"
  is_blocked: Boolean,
  block_reason: String,
  total_revenue: Number,
  payout_processed: Boolean,
  share_link: String,
  qr_code: String,         // Base64 QR code
  cancelled_at: String,
  cancellation_reason: String,
  created_at: String
}
```

### 4. tickets
Purchased tickets linking users to events.

```javascript
{
  id: String,              // UUID - Primary key
  event_id: String,        // References events.id
  user_id: String,         // References users.id
  quantity: Number,
  amount_paid: Number,
  refunded: Boolean,
  refund_reason: String,
  refund_date: String,
  purchase_date: String
}
```

### 5. payment_transactions
Payment tracking for Stripe transactions.

```javascript
{
  id: String,              // UUID
  session_id: String,      // Stripe checkout session ID
  user_id: String,
  event_id: String,
  amount: Number,
  currency: String,        // "usd"
  payment_type: String,    // "ticket" | "streaming_package" | "pro_mode_unlock"
  payment_status: String,  // "pending" | "completed" | "failed"
  metadata: Object,
  created_at: String
}
```

### 6. notifications
User notifications for events, system messages.

```javascript
{
  id: String,
  user_id: String,
  type: String,            // "event_live", "ticket_purchased", etc.
  title: String,
  message: String,
  event_id: String,        // Optional
  read: Boolean,
  read_at: String,
  data: Object,            // Additional data
  created_at: String
}
```

### 7. promo_codes
Discount codes for Pro Mode and tickets.

```javascript
{
  id: String,
  code: String,            // Unique, uppercase
  description: String,
  discount_type: String,   // "percentage" | "fixed"
  discount_value: Number,
  applies_to: String,      // "pro_mode" | "ticket"
  max_uses: Number,
  current_uses: Number,
  min_purchase: Number,
  expiration_date: String,
  is_active: Boolean,
  created_by: String,
  created_at: String
}
```

### 8. pro_mode_sessions
Active Pro Mode streaming sessions.

```javascript
{
  id: String,
  event_id: String,
  creator_id: String,
  room_name: String,       // LiveKit room name
  active_device_id: String,
  connected_devices: [     // Array of connected cameras
    {
      device_id: String,
      device_number: Number,
      connected_at: String
    }
  ],
  is_live: Boolean,
  created_at: String
}
```

### 9. pro_mode_connections
QR code connections for Pro Mode cameras.

```javascript
{
  device_id: String,       // Format: "{event_id}-device-{number}"
  event_id: String,
  device_number: Number,
  connection_token: String,
  creator_id: String,
  is_connected: Boolean,
  connected_at: String,
  created_at: String
}
```

### 10. security_events
Logs of security violations (screen capture attempts).

```javascript
{
  id: String,
  user_id: String,
  event_id: String,
  capture_type: String,    // "screenshot", "screen_recording", etc.
  severity: String,        // "low", "medium", "high"
  details: Object,
  user_agent: String,
  ip_address: String,
  created_at: String
}
```

### 11. user_security_status
User-level security violation tracking.

```javascript
{
  user_id: String,
  violation_count: Number,
  last_violation_at: String,
  is_suspended: Boolean,
  suspended_at: String,
  created_at: String
}
```

### 12. platform_settings
Platform-wide configuration and settings.

```javascript
{
  type: String,            // "about", "config", etc.
  // For type: "about"
  description: String,
  phone: String,
  email: String,
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    youtube: String
  },
  termsUrl: String,
  privacyUrl: String,
  updated_at: String
}
```

---

## Indexes

The following indexes are automatically created on startup:

```javascript
// users
{ email: 1 }          // unique
{ id: 1 }             // unique

// events
{ id: 1 }             // unique
{ creator_id: 1 }
{ status: 1 }
{ date: 1 }
{ city: 1, state: 1 }

// tickets
{ id: 1 }             // unique
{ user_id: 1 }
{ event_id: 1 }

// user_sessions
{ session_token: 1 }  // unique
{ user_id: 1 }
{ expires_at: 1 }     // TTL

// payment_transactions
{ session_id: 1 }
{ user_id: 1 }

// promo_codes
{ code: 1 }           // unique

// notifications
{ user_id: 1 }
{ created_at: -1 }

// pro_mode_sessions
{ event_id: 1 }
{ connection_token: 1 }

// security_events
{ user_id: 1 }
{ event_id: 1 }
```

---

## Migration Notes

If migrating from the Python backend:
1. The schema is identical - no data migration needed
2. All field names use snake_case
3. Dates are stored as ISO strings
4. IDs are UUIDs stored as strings
5. MongoDB's `_id` field is automatically excluded from API responses
