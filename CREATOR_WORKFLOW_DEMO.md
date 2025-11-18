# Content Creator Complete Workflow Demo

## Overview
This document provides a step-by-step mockup of the Content Creator experience on ShowMeLive platform.

---

## Part 1: Creating an Event

### Step 1: Access Creator Dashboard
**URL**: `/creator/dashboard`
**View**: 
- Dashboard shows earnings overview (Total Revenue, Your Earnings 80%, Pending Payout, Total Events)
- Large "Create Event" button in top right
- Grid of existing events (if any)

### Step 2: Click "Create Event"
**URL**: `/creator/create-event`
**Form Fields**:

1. **Event Poster Upload**
   - Drag & drop or click to upload
   - Preview shows immediately
   - Accepts PNG, JPG up to 10MB

2. **Event Details**
   - Title: "Live Comedy Night"
   - Category: Dropdown (Music, Comedy, Sports, Entertainment, Influencer)
   - Date: Date picker (e.g., "2025-12-01")
   - Time: Time picker (e.g., "8:00 PM")
   - Venue: "Downtown Comedy Club"
   - Ticket Price: "$25.00"

3. **Description**
   - Textarea: "Join us for an unforgettable evening of stand-up comedy..."

4. **Streaming Package Selection**
   - Two cards side by side:
   
   **FREE PACKAGE** (Selected by default)
   - 1 streaming device
   - $0
   - Basic streaming capabilities
   
   **PREMIUM PACKAGE**
   - 5 streaming devices + control panel
   - $1,000
   - Multi-camera switching
   - Professional production

5. **Submit Button**
   - "Create Event" - Blue button
   - "Cancel" - Gray button

### Step 3: Event Created Successfully
**Result**: 
- Event appears in Creator Dashboard
- QR Code generated automatically
- Share Link created: `https://showmelive.online/event/{event_id}`

---

## Part 2: Setting Up Streaming Devices

### Step 1: Access Control Panel
**From Dashboard**: Click "Manage Stream" on your event
**URL**: `/control-panel/{event_id}`

**Control Panel Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  {Event Title} - Control Panel              [Back]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  LIVE STREAM VIEW (Main Display)                       │
│  ┌───────────────────────────────────────────────┐    │
│  │                                               │    │
│  │   [Currently Streaming from Device 1]        │    │
│  │                                               │    │
│  │   🔴 LIVE                                    │    │
│  │                                               │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  DEVICE GRID                                            │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Device 1 │  │ Device 2 │  │ [+ Add]  │            │
│  │  📱      │  │  📱      │  │  Device  │            │
│  │ ✅ Active│  │ ⚪ Ready │  │          │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 2: Add Streaming Device
**Click**: "+ Add Device" button

**QR Code Modal Appears**:
```
┌─────────────────────────────────┐
│  Scan QR Code on Device         │
│                                 │
│  ┌─────────────────────┐       │
│  │                     │       │
│  │   [QR CODE IMAGE]   │       │
│  │                     │       │
│  └─────────────────────┘       │
│                                 │
│  Scan with your phone/tablet   │
│  to connect as streaming device │
│                                 │
│  [Copy Link]  [Close]          │
└─────────────────────────────────┘
```

### Step 3: Mobile Device - Scan QR Code
**On Phone/Tablet**: 
- Open camera app
- Scan QR code from control panel
- Browser opens to: `/stream/{device_token}`

**Streaming Device View**:
```
┌─────────────────────────────┐
│      ShowMeLive             │
│   Streaming Device          │
│                             │
│  ┌─────────────────────┐   │
│  │                     │   │
│  │  CAMERA VIEW        │   │
│  │  [Live preview]     │   │
│  │                     │   │
│  └─────────────────────┘   │
│                             │
│  📹 Camera: READY           │
│  📶 Connection: Good        │
│                             │
│  ┌─────────────────────┐   │
│  │  START STREAMING    │   │
│  └─────────────────────┘   │
│                             │
│  Instructions:              │
│  • Keep device steady       │
│  • Ensure good lighting     │
│  • Monitor battery          │
│  • Creator can switch to    │
│    this camera              │
└─────────────────────────────┘
```

### Step 4: Start Streaming from Device
**Click**: "START STREAMING" button

**Device Status Updates to**:
```
┌─────────────────────────────┐
│      ShowMeLive             │
│   Streaming Device          │
│                             │
│  ┌─────────────────────┐   │
│  │                     │   │
│  │  📹 CAMERA ACTIVE   │   │
│  │  [Live feed]        │   │
│  │  🔴 LIVE            │   │
│  │                     │   │
│  └─────────────────────┘   │
│                             │
│  ✅ STREAMING ACTIVE        │
│  Duration: 00:05:23         │
│                             │
│  ┌─────────────────────┐   │
│  │  STOP STREAMING     │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### Step 5: Multiple Devices Connected
**Premium Package Example** (5 devices):
```
Control Panel View:

┌─────────────────────────────────────────────────────────┐
│  Live Comedy Night - Control Panel                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  LIVE STREAM VIEW (Active: Device 3)                   │
│  ┌───────────────────────────────────────────────┐    │
│  │  [Stage View - Comedian Full Shot]            │    │
│  │  🔴 LIVE - Device 3 Active                   │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  AVAILABLE CAMERAS (Click to switch)                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │Device 1  │  │Device 2  │  │Device 3  │            │
│  │Front     │  │Audience  │  │Stage     │            │
│  │Stage     │  │Reaction  │  │Full      │            │
│  │✅ Active │  │✅ Active │  │🔴 LIVE   │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                         │
│  ┌──────────┐  ┌──────────┐                           │
│  │Device 4  │  │Device 5  │                           │
│  │Close-up  │  │Wide Shot │                           │
│  │✅ Active │  │✅ Active │                           │
│  └──────────┘  └──────────┘                           │
│                                                         │
│  Package: Premium (5/5 devices connected)              │
└─────────────────────────────────────────────────────────┘
```

---

## Part 3: Going Live - Complete Scenario

### Pre-Event Setup (30 mins before)

1. **Creator logs in** → Goes to Creator Dashboard
2. **Opens Control Panel** for "Live Comedy Night" event
3. **Adds 5 devices** (Premium package):
   - Device 1: Phone on tripod at front of stage
   - Device 2: Tablet in audience (reactions)
   - Device 3: Phone on stage (full shot)
   - Device 4: Phone for close-ups
   - Device 5: Tablet for wide room shot

4. **Each device**:
   - Scans QR code
   - Opens streaming interface
   - Tests camera
   - Clicks "START STREAMING"
   - Shows as "✅ Active" in Control Panel

### During Event

**Control Panel Actions**:
```
Timeline:

8:00 PM - Show Starts
└─ Switch to Device 5 (Wide Shot) - Audience entering

8:05 PM - Comedian takes stage
└─ Switch to Device 3 (Stage Full) - Comedian intro

8:10 PM - First jokes
└─ Switch to Device 4 (Close-up) - Facial expressions

8:15 PM - Audience laughing
└─ Switch to Device 2 (Audience) - Show reactions

8:20 PM - Peak moment
└─ Switch to Device 1 (Front Stage) - Best angle

Continues with dynamic switching...
```

**Viewer Experience**:
- Sees smooth camera angle changes
- High-quality multi-angle production
- Professional streaming experience

### Post-Event

**Automatic Actions**:
- Event status changes to "completed"
- 24-hour countdown starts for payout
- Revenue calculation: 
  - 100 tickets × $25 = $2,500 total
  - Platform fee (20%): $500
  - Creator earnings (80%): $2,000

**Creator Dashboard Updates**:
```
Earnings Overview:
├─ Total Revenue: $2,500
├─ Your Earnings (80%): $2,000  
├─ Pending Payout: $2,000 (Available in 23h 45m)
└─ Platform Fee: $500
```

---

## Control Panel Features Summary

### Main Display
- **Large video preview** of currently selected camera
- **Live indicator** (red dot + "LIVE" text)
- **Current device name** shown

### Device Grid
- **Thumbnail preview** of each connected device
- **Status indicators**:
  - ✅ Active (streaming ready)
  - 🔴 LIVE (currently broadcasting)
  - ⚪ Ready (connected but not streaming)
  - ❌ Offline (disconnected)
- **Click to switch** - Instant camera change

### Info Bar
- **Package type** (Free: 1/1 or Premium: 5/5)
- **Connection status** for each device
- **Battery warnings** if device low on power

### Additional Controls
- **Record stream** (optional)
- **Mute/unmute** audio
- **Quality settings**
- **Share link** to event

---

## Mobile Device Interface Details

### Landscape Orientation Optimized
When streaming, device should be in landscape mode for better video quality.

### On-Screen Controls
```
┌─────────────────────────────────────────┐
│  📹 [Camera View - Full Screen]         │
│                                         │
│  [Top Overlay]                          │
│  🔴 LIVE  Duration: 00:15:32           │
│  Connection: ████████ Excellent         │
│                                         │
│  [Bottom Overlay]                       │
│  🔋 85%  📶 4G/WiFi  🌡️ Normal Temp   │
│                                         │
│  [Stop Streaming]                       │
└─────────────────────────────────────────┘
```

### Notifications
- **Auto-dimming** disabled during stream
- **Battery alert** at 20%
- **Connection warning** if unstable
- **Temperature warning** if overheating

---

## Testing the Full Flow

To test this complete workflow:

1. **Create a test creator account**
2. **Select "Content Creator" role**
3. **Create an event with premium package**
4. **Open control panel on desktop/laptop**
5. **Use multiple phones/tablets to scan QR codes**
6. **Start streaming from each device**
7. **Switch between cameras in control panel**
8. **Observe smooth transitions**

---

## Technical Notes

- **QR Codes**: Contain device authentication tokens
- **WebRTC**: Would be used for real streaming (currently mocked)
- **Socket.io**: Would handle real-time device communication
- **Bandwidth**: Premium package requires good internet (5+ Mbps upload per device)
- **Latency**: ~2-5 seconds typical delay
- **Resolution**: 720p default, 1080p for premium package

---

## UI/UX Highlights

✅ **Intuitive**: QR code pairing is familiar to users
✅ **Visual**: Clear status indicators for all devices  
✅ **Responsive**: Works on all screen sizes
✅ **Real-time**: Instant camera switching
✅ **Professional**: Multi-camera setup rivals TV production
✅ **Mobile-first**: Streaming interface optimized for phones/tablets
