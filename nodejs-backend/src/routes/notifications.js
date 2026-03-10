/**
 * Notification Routes
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../services/database');
const { requireAuth } = require('../middleware/auth');
const { nowISO, sanitizeDocs } = require('../utils/helpers');

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const notifications = await db.collection('notifications').find(
      { user_id: req.user.id },
      { projection: { _id: 0 }, sort: { created_at: -1 }, limit: 50 }
    ).toArray();

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ detail: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const count = await db.collection('notifications').countDocuments({
      user_id: req.user.id,
      read: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ detail: 'Failed to get unread count' });
  }
});

/**
 * POST /api/notifications/:notificationId/read
 * Mark notification as read
 */
router.post('/:notificationId/read', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    
    await db.collection('notifications').updateOne(
      { id: req.params.notificationId, user_id: req.user.id },
      { $set: { read: true, read_at: nowISO() } }
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ detail: 'Failed to mark notification as read' });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    
    await db.collection('notifications').updateMany(
      { user_id: req.user.id, read: false },
      { $set: { read: true, read_at: nowISO() } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ detail: 'Failed to mark all as read' });
  }
});

/**
 * DELETE /api/notifications/:notificationId
 * Delete notification
 */
router.delete('/:notificationId', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    
    await db.collection('notifications').deleteOne({
      id: req.params.notificationId,
      user_id: req.user.id
    });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ detail: 'Failed to delete notification' });
  }
});

module.exports = router;
