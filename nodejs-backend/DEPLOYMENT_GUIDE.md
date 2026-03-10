# ShowMeLive - cPanel Deployment Guide

## Overview
This guide explains how to deploy ShowMeLive to a cPanel hosting environment with Node.js support.

---

## Prerequisites

1. **cPanel with Node.js support** (A2 Hosting, SiteGround, etc.)
2. **MongoDB Atlas account** (free tier available at https://cloud.mongodb.com)
3. **Stripe account** (https://dashboard.stripe.com)
4. **LiveKit Cloud or self-hosted** (https://cloud.livekit.io)

---

## Directory Structure

After deployment, your cPanel should have:

```
public_html/
├── api/                    # Node.js backend (optional subdirectory)
│   ├── src/
│   ├── uploads/
│   ├── package.json
│   ├── .env
│   └── node_modules/
└── (frontend build files)  # React static files
    ├── index.html
    ├── static/
    └── ...
```

---

## Step 1: Set Up MongoDB Atlas

1. Go to https://cloud.mongodb.com and create a free account
2. Create a new cluster (free tier M0 is sufficient for starting)
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.xxxxx.mongodb.net/`)
5. Replace `<password>` with your actual password
6. Add `/showmelive` at the end for the database name

---

## Step 2: Deploy Backend (Node.js)

### Option A: Node.js in cPanel

1. In cPanel, go to "Setup Node.js App"
2. Click "Create Application"
3. Configure:
   - Node.js version: 18.x or higher
   - Application mode: Production
   - Application root: `api` (or your preferred directory)
   - Application startup file: `src/server.js`
4. Upload the `nodejs-backend` folder contents to this directory
5. In cPanel File Manager, navigate to the `api` folder
6. Create `.env` file from `.env.example` and fill in values
7. In the Node.js app panel, click "Run NPM Install"
8. Click "Restart" to start the application

### Option B: Subdomain for API

1. Create subdomain `api.yourdomain.com`
2. Set it up as a separate Node.js application
3. Point frontend `REACT_APP_BACKEND_URL` to `https://api.yourdomain.com`

---

## Step 3: Deploy Frontend (React)

### Build the Frontend

On your local machine:

```bash
cd frontend
npm install
npm run build
```

This creates a `build` folder with static files.

### Upload to cPanel

1. Upload the contents of `build/` to `public_html/` (or your document root)
2. Make sure `index.html` is in the root

### Configure .htaccess for React Router

Create `.htaccess` in `public_html/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite API requests
  RewriteCond %{REQUEST_URI} ^/api [NC]
  RewriteRule ^ - [L]
  
  # Don't rewrite files and directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Rewrite everything else to index.html
  RewriteRule ^ index.html [L]
</IfModule>
```

---

## Step 4: Configure Environment Variables

### Backend (.env)

```env
# MongoDB Atlas connection
MONGO_URL=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/showmelive?retryWrites=true&w=majority
DB_NAME=showmelive

# Server
PORT=8001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com/api

# Stripe (from dashboard.stripe.com)
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# LiveKit (from cloud.livekit.io or self-hosted)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxx

# Authentication
JWT_SECRET=your-super-secret-random-string-at-least-64-characters

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-admin-password
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=https://yourdomain.com
```

---

## Step 5: Set Up Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/payments/webhook/stripe`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
4. Copy the webhook signing secret to your backend `.env`

---

## Step 6: Configure LiveKit

### Option A: LiveKit Cloud (Recommended)
1. Create account at https://cloud.livekit.io
2. Create a new project
3. Copy API Key and Secret to your `.env`

### Option B: Self-Hosted
1. Follow https://docs.livekit.io/oss/deployment/
2. Set `LIVEKIT_URL` to your server URL

---

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `CORS_ORIGINS` in backend `.env` includes your frontend URL
   - Check that the frontend is using the correct `REACT_APP_BACKEND_URL`

2. **Node.js App Not Starting**
   - Check cPanel error logs
   - Verify all environment variables are set
   - Ensure `node_modules` is properly installed

3. **MongoDB Connection Failed**
   - Whitelist your server IP in MongoDB Atlas (or allow all: 0.0.0.0/0)
   - Verify connection string is correct

4. **WebSocket Not Working**
   - Some cPanel hosts don't support WebSocket on shared hosting
   - Consider using a VPS for full WebSocket support

5. **File Uploads Not Working**
   - Ensure `uploads/` directory exists and is writable
   - Check file size limits in cPanel

### Checking Logs

In cPanel:
1. Go to "Errors" in the Logs section
2. For Node.js specific logs, check the app's stderr.log

---

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT_SECRET (64+ random characters)
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set proper CORS origins (don't use `*` in production)
- [ ] Configure Stripe webhook signature verification
- [ ] Whitelist only necessary IPs in MongoDB Atlas

---

## Performance Tips

1. **Enable caching** for static assets in `.htaccess`
2. **Use MongoDB indexes** (auto-created on startup)
3. **Enable gzip compression** in cPanel
4. **Consider CDN** for images and static assets

---

## Support

For issues with:
- **LiveKit**: https://docs.livekit.io
- **Stripe**: https://stripe.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com
