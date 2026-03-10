# ShowMeLive - Virtual Event Platform

A Netflix-inspired virtual event platform for live streaming events with multi-camera support, real-time chat, and Stripe payments.

## Features

- 🎬 **Live Streaming** - WebRTC-based streaming via LiveKit
- 🎥 **Pro Mode** - Multi-camera streaming with up to 5 devices
- 💬 **Real-time Chat** - Live chat with emoji reactions
- 💳 **Payments** - Stripe integration for tickets and subscriptions
- 🌍 **Geo-fencing** - Location-based event restrictions
- 🔒 **Security** - Screen capture prevention system
- 👤 **Role-based Access** - Creators, Viewers, and Admins

## Tech Stack

### Frontend
- React 19
- Tailwind CSS
- shadcn/ui components
- LiveKit React SDK
- React Router

### Backend (Node.js)
- Express.js
- MongoDB
- Stripe SDK
- LiveKit Server SDK
- WebSocket support

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Stripe account
- LiveKit Cloud or self-hosted

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd showmelive
```

2. **Install backend dependencies**
```bash
cd nodejs-backend
npm install
cp .env.example .env
# Edit .env with your credentials
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your backend URL
```

4. **Start the backend**
```bash
cd ../nodejs-backend
npm start
```

5. **Start the frontend**
```bash
cd ../frontend
npm start
```

## Project Structure

```
showmelive/
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── App.js          # Main app component
│   ├── public/
│   └── package.json
│
├── nodejs-backend/         # Node.js backend
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Main server file
│   ├── uploads/            # File uploads
│   └── package.json
│
└── README.md
```

## Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=showmelive
PORT=8001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com/api
STRIPE_API_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
JWT_SECRET=your-secret-key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://yourdomain.com
```

## API Endpoints

### Authentication
- `POST /api/auth/session` - Create session from OAuth
- `GET /api/auth/me` - Get current user
- `POST /api/auth/role` - Set user role
- `POST /api/auth/logout` - Logout

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event details
- `POST /api/events/:id/go-live` - Start streaming
- `POST /api/events/:id/end` - End event

### Tickets
- `GET /api/tickets` - Get user's tickets
- `POST /api/tickets` - Purchase ticket
- `DELETE /api/tickets/:id` - Delete ticket

### Payments
- `POST /api/payments/checkout/session` - Create checkout
- `GET /api/payments/checkout/status/:id` - Check payment status

### Streaming
- `POST /api/livekit/join-as-creator` - Get creator token
- `POST /api/livekit/join-as-viewer` - Get viewer token

### Pro Mode
- `POST /api/pro-mode/unlock/checkout` - Pay for Pro Mode
- `GET /api/pro-mode/device-qr/:eventId/:deviceNumber` - Get QR code
- `POST /api/pro-mode/connect-device` - Connect camera device
- `POST /api/pro-mode/set-active-device` - Switch active camera

## Deployment

See [DEPLOYMENT_GUIDE.md](./nodejs-backend/DEPLOYMENT_GUIDE.md) for detailed cPanel deployment instructions.

## Database Schema

See [MONGODB_SCHEMA.md](./nodejs-backend/MONGODB_SCHEMA.md) for collection schemas.

## License

Private - All rights reserved
