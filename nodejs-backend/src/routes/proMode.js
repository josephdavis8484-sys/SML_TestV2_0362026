/**
 * Pro Mode Routes (Multi-camera streaming)
 */

const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Stripe = require('stripe');
const { AccessToken } = require('livekit-server-sdk');
const { getDB } = require('../services/database');
const { requireAuth, requireCreator } = require('../middleware/auth');
const { generateId, nowISO, generateToken, sanitizeDoc } = require('../utils/helpers');

const stripe = new Stripe(process.env.STRIPE_API_KEY);
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const PRO_MODE_FEE = parseFloat(process.env.PRO_MODE_FEE) || 1000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Generate LiveKit token for Pro Mode
 */
async function generateProModeToken(roomName, participantIdentity, canPublish = false) {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    ttl: 24 * 60 * 60
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe: true
  });

  return at.toJwt();
}

/**
 * POST /api/pro-mode/unlock/checkout
 * Create checkout session for Pro Mode unlock
 */
router.post('/unlock/checkout', requireCreator, async (req, res) => {
  try {
    const { event_id, origin_url, promo_code } = req.body;

    if (!event_id) {
      return res.status(400).json({ detail: 'event_id is required' });
    }

    const db = getDB();
    const event = await db.collection('events').findOne({
      id: event_id,
      creator_id: req.user.id
    });

    if (!event) {
      return res.status(404).json({ detail: 'Event not found or you don\'t own it' });
    }

    if (event.streaming_package === 'premium') {
      return res.status(400).json({ detail: 'Pro Mode already unlocked for this event' });
    }

    let amount = PRO_MODE_FEE;
    let discount = 0;

    // Apply promo code if provided
    if (promo_code) {
      const promo = await db.collection('promo_codes').findOne({
        code: promo_code.toUpperCase(),
        is_active: true,
        applies_to: 'pro_mode'
      });

      if (promo) {
        if (promo.discount_type === 'percentage') {
          discount = (amount * promo.discount_value) / 100;
        } else {
          discount = promo.discount_value;
        }
        amount = Math.max(0, amount - discount);

        // Increment usage
        await db.collection('promo_codes').updateOne(
          { id: promo.id },
          { $inc: { current_uses: 1 } }
        );
      }
    }

    // Skip Stripe if free after discount
    if (amount <= 0) {
      await db.collection('events').updateOne(
        { id: event_id },
        { $set: { streaming_package: 'premium' } }
      );
      return res.json({ success: true, message: 'Pro Mode unlocked for free' });
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Pro Mode Unlock - ${event.title}` },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${origin_url}/creator/dashboard?pro_mode_success=true&event_id=${event_id}`,
      cancel_url: `${origin_url}/creator/dashboard?pro_mode_cancelled=true`,
      metadata: {
        user_id: req.user.id,
        event_id,
        payment_type: 'pro_mode_unlock',
        original_amount: String(PRO_MODE_FEE),
        discount: String(discount)
      }
    });

    // Store transaction
    await db.collection('payment_transactions').insertOne({
      id: generateId(),
      session_id: session.id,
      user_id: req.user.id,
      event_id,
      amount,
      currency: 'usd',
      payment_type: 'pro_mode_unlock',
      payment_status: 'pending',
      created_at: nowISO()
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Pro mode checkout error:', error);
    res.status(500).json({ detail: 'Failed to create checkout session' });
  }
});

/**
 * GET /api/pro-mode/device-qr/:eventId/:deviceNumber
 * Get QR code for device connection
 */
router.get('/device-qr/:eventId/:deviceNumber', requireCreator, async (req, res) => {
  try {
    const { eventId, deviceNumber } = req.params;
    const db = getDB();

    const event = await db.collection('events').findOne({
      id: eventId,
      creator_id: req.user.id
    });

    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    if (event.streaming_package !== 'premium') {
      return res.status(403).json({ detail: 'Pro Mode not unlocked for this event' });
    }

    // Generate connection token
    const connectionToken = generateToken(32);
    const deviceId = `${eventId}-device-${deviceNumber}`;
    const connectUrl = `${FRONTEND_URL}/pro-mode/camera/${eventId}/${deviceNumber}?token=${connectionToken}`;

    // Store connection token
    await db.collection('pro_mode_connections').updateOne(
      { device_id: deviceId },
      {
        $set: {
          device_id: deviceId,
          event_id: eventId,
          device_number: parseInt(deviceNumber),
          connection_token: connectionToken,
          creator_id: req.user.id,
          is_connected: false,
          created_at: nowISO()
        }
      },
      { upsert: true }
    );

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(connectUrl, {
      width: 300,
      color: { dark: '#0000FF', light: '#FFFFFF' }
    });

    res.json({
      qr_code: qrCodeDataUrl,
      device_number: parseInt(deviceNumber),
      connect_url: connectUrl,
      connection_token: connectionToken
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ detail: 'Failed to generate QR code' });
  }
});

/**
 * POST /api/pro-mode/connect-device
 * Connect a camera device
 */
router.post('/connect-device', async (req, res) => {
  try {
    const { event_id, device_number, connection_token } = req.body;
    const db = getDB();

    const deviceId = `${event_id}-device-${device_number}`;

    // Verify connection
    const connection = await db.collection('pro_mode_connections').findOne({
      device_id: deviceId,
      connection_token
    });

    if (!connection) {
      return res.status(403).json({ detail: 'Invalid connection token' });
    }

    const event = await db.collection('events').findOne({ id: event_id });
    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    // Get or create Pro Mode session
    let session = await db.collection('pro_mode_sessions').findOne({ event_id });

    if (!session) {
      const roomName = `promode-${event_id}`;
      session = {
        id: generateId(),
        event_id,
        creator_id: connection.creator_id,
        room_name: roomName,
        active_device_id: null,
        connected_devices: [],
        is_live: false,
        created_at: nowISO()
      };
      await db.collection('pro_mode_sessions').insertOne(session);
    }

    // Generate token for device
    const participantIdentity = `Camera-${device_number}`;
    const token = await generateProModeToken(session.room_name, participantIdentity, true);

    // Add device to connected list
    const deviceInfo = { device_id: deviceId, device_number: parseInt(device_number), connected_at: nowISO() };
    
    await db.collection('pro_mode_sessions').updateOne(
      { event_id },
      { 
        $addToSet: { connected_devices: deviceInfo },
        $set: { is_live: true }
      }
    );

    await db.collection('pro_mode_connections').updateOne(
      { device_id: deviceId },
      { $set: { is_connected: true, connected_at: nowISO() } }
    );

    res.json({
      token,
      url: LIVEKIT_URL,
      room_name: session.room_name,
      device_id: deviceId,
      participant_identity: participantIdentity
    });
  } catch (error) {
    console.error('Connect device error:', error);
    res.status(500).json({ detail: 'Failed to connect device' });
  }
});

/**
 * POST /api/pro-mode/set-active-device
 * Set active camera device
 */
router.post('/set-active-device', requireCreator, async (req, res) => {
  try {
    const { event_id, device_id } = req.body;
    const db = getDB();

    await db.collection('pro_mode_sessions').updateOne(
      { event_id },
      { $set: { active_device_id: device_id } }
    );

    res.json({ message: 'Active device updated', active_device_id: device_id });
  } catch (error) {
    console.error('Set active device error:', error);
    res.status(500).json({ detail: 'Failed to set active device' });
  }
});

/**
 * GET /api/pro-mode/session/:eventId
 * Get Pro Mode session status
 */
router.get('/session/:eventId', async (req, res) => {
  try {
    const db = getDB();
    const session = await db.collection('pro_mode_sessions').findOne(
      { event_id: req.params.eventId },
      { projection: { _id: 0 } }
    );

    if (!session) {
      return res.status(404).json({ detail: 'Pro Mode session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ detail: 'Failed to get session' });
  }
});

/**
 * POST /api/pro-mode/disconnect-device
 * Disconnect a camera device
 */
router.post('/disconnect-device', async (req, res) => {
  try {
    const { event_id, device_id } = req.body;
    const db = getDB();

    await db.collection('pro_mode_sessions').updateOne(
      { event_id },
      { $pull: { connected_devices: { device_id } } }
    );

    await db.collection('pro_mode_connections').updateOne(
      { device_id },
      { $set: { is_connected: false } }
    );

    res.json({ message: 'Device disconnected' });
  } catch (error) {
    console.error('Disconnect device error:', error);
    res.status(500).json({ detail: 'Failed to disconnect device' });
  }
});

module.exports = router;
