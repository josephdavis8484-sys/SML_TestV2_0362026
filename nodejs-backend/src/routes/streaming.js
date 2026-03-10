/**
 * Streaming Routes (alias for LiveKit + additional features)
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../services/database');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/streaming/status/:eventId
 * Get stream status
 */
router.get('/status/:eventId', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const event = await db.collection('events').findOne(
      { id: req.params.eventId },
      { projection: { _id: 0, status: 1, is_blocked: 1 } }
    );

    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    const proSession = await db.collection('pro_mode_sessions').findOne(
      { event_id: req.params.eventId },
      { projection: { _id: 0 } }
    );

    res.json({
      status: event.status,
      is_blocked: event.is_blocked,
      is_live: event.status === 'live',
      pro_mode: proSession ? {
        is_active: proSession.is_live,
        active_device: proSession.active_device_id,
        connected_devices: proSession.connected_devices || []
      } : null
    });
  } catch (error) {
    console.error('Get stream status error:', error);
    res.status(500).json({ detail: 'Failed to get stream status' });
  }
});

module.exports = router;
