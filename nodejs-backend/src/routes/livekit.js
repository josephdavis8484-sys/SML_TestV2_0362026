/**
 * LiveKit Streaming Routes
 */

const express = require('express');
const router = express.Router();
const { AccessToken } = require('livekit-server-sdk');
const { getDB } = require('../services/database');
const { requireAuth, requireCreator } = require('../middleware/auth');
const { generateId, nowISO } = require('../utils/helpers');

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

/**
 * Generate LiveKit token
 */
function generateLiveKitToken(roomName, participantIdentity, canPublish = false) {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('LiveKit credentials not configured');
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    ttl: 24 * 60 * 60 // 24 hours
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
 * POST /api/livekit/join-as-creator
 * Get token for creator to publish stream
 */
router.post('/join-as-creator', requireCreator, async (req, res) => {
  try {
    const { event_id, device_name = 'Main Camera' } = req.body;

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

    const roomName = `event-${event_id}`;
    const participantIdentity = `creator_${req.user.id}`;

    const token = await generateLiveKitToken(roomName, participantIdentity, true);

    res.json({
      token,
      url: LIVEKIT_URL,
      room_name: roomName,
      participant_identity: participantIdentity
    });
  } catch (error) {
    console.error('Join as creator error:', error);
    res.status(500).json({ detail: error.message || 'Failed to generate token' });
  }
});

/**
 * POST /api/livekit/join-as-viewer
 * Get token for viewer to watch stream
 */
router.post('/join-as-viewer', requireAuth, async (req, res) => {
  try {
    const { event_id, user_name } = req.body;

    if (!event_id) {
      return res.status(400).json({ detail: 'event_id is required' });
    }

    const db = getDB();
    const event = await db.collection('events').findOne({ id: event_id });

    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    // Check if user has ticket for paid events
    if (event.price > 0) {
      const ticket = await db.collection('tickets').findOne({
        event_id,
        user_id: req.user.id,
        refunded: false
      });

      if (!ticket) {
        return res.status(403).json({ detail: 'Ticket required to watch this event' });
      }
    }

    // Check for Pro Mode session
    const proSession = await db.collection('pro_mode_sessions').findOne({
      event_id,
      is_live: true
    });

    const roomName = proSession ? proSession.room_name : `event-${event_id}`;
    const participantIdentity = `viewer_${req.user.id}_${Date.now()}`;

    const token = await generateLiveKitToken(roomName, participantIdentity, false);

    res.json({
      token,
      url: LIVEKIT_URL,
      room_name: roomName,
      is_pro_mode: !!proSession
    });
  } catch (error) {
    console.error('Join as viewer error:', error);
    res.status(500).json({ detail: error.message || 'Failed to generate token' });
  }
});

/**
 * GET /api/livekit/viewer-token/:eventId
 * Alternative endpoint for viewer token
 */
router.get('/viewer-token/:eventId', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const event = await db.collection('events').findOne({ id: req.params.eventId });

    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    const proSession = await db.collection('pro_mode_sessions').findOne({
      event_id: req.params.eventId,
      is_live: true
    });

    const roomName = proSession ? proSession.room_name : `event-${req.params.eventId}`;
    const participantIdentity = `viewer_${req.user.id}_${Date.now()}`;

    const token = await generateLiveKitToken(roomName, participantIdentity, false);

    res.json({
      token,
      url: LIVEKIT_URL,
      room_name: roomName,
      is_pro_mode: !!proSession
    });
  } catch (error) {
    console.error('Get viewer token error:', error);
    res.status(500).json({ detail: error.message || 'Failed to generate token' });
  }
});

/**
 * POST /api/livekit/end-stream/:eventId
 * End stream
 */
router.post('/end-stream/:eventId', requireCreator, async (req, res) => {
  try {
    const db = getDB();
    
    await db.collection('events').updateOne(
      { id: req.params.eventId, creator_id: req.user.id },
      { $set: { status: 'completed' } }
    );

    // End any Pro Mode session
    await db.collection('pro_mode_sessions').updateOne(
      { event_id: req.params.eventId },
      { $set: { is_live: false } }
    );

    res.json({ message: 'Stream ended' });
  } catch (error) {
    console.error('End stream error:', error);
    res.status(500).json({ detail: 'Failed to end stream' });
  }
});

module.exports = router;
