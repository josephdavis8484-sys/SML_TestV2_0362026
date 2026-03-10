/**
 * Admin Routes
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../services/database');
const { requireAdmin, generateSessionToken } = require('../middleware/auth');
const { generateId, nowISO, addDays, sanitizeDoc, sanitizeDocs } = require('../utils/helpers');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@showmelive.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const PLATFORM_FEE_PERCENTAGE = parseInt(process.env.PLATFORM_FEE_PERCENTAGE) || 20;

/**
 * POST /api/admin/login
 * Admin login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const db = getDB();
    
    // Find or create admin user
    let adminUser = await db.collection('users').findOne({ email: ADMIN_EMAIL });
    
    if (!adminUser) {
      adminUser = {
        id: `admin-${generateId()}`,
        email: ADMIN_EMAIL,
        name: 'Admin',
        role: 'admin',
        is_blocked: false,
        created_at: nowISO()
      };
      await db.collection('users').insertOne(adminUser);
    }

    // Create session
    const sessionToken = `admin_${generateId()}`;
    const expiresAt = addDays(7);

    await db.collection('user_sessions').insertOne({
      user_id: adminUser.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      created_at: nowISO()
    });

    res.json({ session_token: sessionToken, user: sanitizeDoc(adminUser) });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ detail: 'Login failed' });
  }
});

/**
 * GET /api/admin/dashboard
 * Admin dashboard stats
 */
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const db = getDB();

    const [
      totalUsers,
      totalCreators,
      totalViewers,
      blockedUsers,
      totalEvents,
      liveEvents,
      blockedEvents,
      totalTickets
    ] = await Promise.all([
      db.collection('users').countDocuments({}),
      db.collection('users').countDocuments({ role: 'creator' }),
      db.collection('users').countDocuments({ role: 'viewer' }),
      db.collection('users').countDocuments({ is_blocked: true }),
      db.collection('events').countDocuments({}),
      db.collection('events').countDocuments({ status: 'live' }),
      db.collection('events').countDocuments({ is_blocked: true }),
      db.collection('tickets').countDocuments({})
    ]);

    // Calculate revenue
    const events = await db.collection('events').find({}, { projection: { total_revenue: 1 } }).toArray();
    const totalRevenue = events.reduce((sum, e) => sum + (e.total_revenue || 0), 0);
    const platformEarnings = totalRevenue * (PLATFORM_FEE_PERCENTAGE / 100);

    res.json({
      users: { total: totalUsers, creators: totalCreators, viewers: totalViewers, blocked: blockedUsers },
      events: { total: totalEvents, live: liveEvents, blocked: blockedEvents },
      tickets: { total: totalTickets },
      revenue: { total: totalRevenue, platform_earnings: platformEarnings }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ detail: 'Failed to fetch dashboard' });
  }
});

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const users = await db.collection('users').find({}, { projection: { _id: 0 } }).toArray();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ detail: 'Failed to fetch users' });
  }
});

/**
 * POST /api/admin/users/:userId/block
 * Block user
 */
router.post('/users/:userId/block', requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const db = getDB();

    const result = await db.collection('users').updateOne(
      { id: req.params.userId },
      { $set: { is_blocked: true, block_reason: reason, blocked_at: nowISO() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Invalidate sessions
    await db.collection('user_sessions').deleteMany({ user_id: req.params.userId });

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ detail: 'Failed to block user' });
  }
});

/**
 * POST /api/admin/users/:userId/unblock
 * Unblock user
 */
router.post('/users/:userId/unblock', requireAdmin, async (req, res) => {
  try {
    const db = getDB();

    const result = await db.collection('users').updateOne(
      { id: req.params.userId },
      { $set: { is_blocked: false }, $unset: { block_reason: '', blocked_at: '' } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ detail: 'User not found' });
    }

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ detail: 'Failed to unblock user' });
  }
});

/**
 * GET /api/admin/events
 * Get all events with details
 */
router.get('/events', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const events = await db.collection('events').find({}, { projection: { _id: 0 } }).toArray();

    // Get creators
    const creatorIds = [...new Set(events.map(e => e.creator_id).filter(Boolean))];
    const creators = await db.collection('users').find(
      { id: { $in: creatorIds } },
      { projection: { _id: 0, id: 1, name: 1, email: 1, picture: 1 } }
    ).toArray();
    const creatorMap = Object.fromEntries(creators.map(c => [c.id, c]));

    // Enrich events
    for (const event of events) {
      event.creator = creatorMap[event.creator_id] || { name: 'Unknown', email: '' };
      event.ticket_count = await db.collection('tickets').countDocuments({ event_id: event.id, refunded: false });
      event.refunded_count = await db.collection('tickets').countDocuments({ event_id: event.id, refunded: true });
      event.platform_fee = (event.total_revenue || 0) * 0.20;
      event.creator_earnings = (event.total_revenue || 0) * 0.80;
    }

    res.json(events);
  } catch (error) {
    console.error('Get admin events error:', error);
    res.status(500).json({ detail: 'Failed to fetch events' });
  }
});

/**
 * POST /api/admin/events/:eventId/block
 * Block event
 */
router.post('/events/:eventId/block', requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const db = getDB();

    const result = await db.collection('events').updateOne(
      { id: req.params.eventId },
      { $set: { is_blocked: true, block_reason: reason, status: 'cancelled' } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    res.json({ message: 'Event blocked successfully' });
  } catch (error) {
    console.error('Block event error:', error);
    res.status(500).json({ detail: 'Failed to block event' });
  }
});

/**
 * POST /api/admin/events/:eventId/unblock
 * Unblock event
 */
router.post('/events/:eventId/unblock', requireAdmin, async (req, res) => {
  try {
    const db = getDB();

    const result = await db.collection('events').updateOne(
      { id: req.params.eventId },
      { $set: { is_blocked: false, status: 'upcoming' }, $unset: { block_reason: '' } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    res.json({ message: 'Event unblocked successfully' });
  } catch (error) {
    console.error('Unblock event error:', error);
    res.status(500).json({ detail: 'Failed to unblock event' });
  }
});

/**
 * DELETE /api/admin/events/:eventId
 * Delete event
 */
router.delete('/events/:eventId', requireAdmin, async (req, res) => {
  try {
    const db = getDB();

    await db.collection('events').deleteOne({ id: req.params.eventId });
    await db.collection('tickets').deleteMany({ event_id: req.params.eventId });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ detail: 'Failed to delete event' });
  }
});

/**
 * GET /api/admin/promo-codes
 * Get all promo codes
 */
router.get('/promo-codes', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const promoCodes = await db.collection('promo_codes').find({}, { projection: { _id: 0 } }).toArray();
    res.json(promoCodes);
  } catch (error) {
    console.error('Get promo codes error:', error);
    res.status(500).json({ detail: 'Failed to fetch promo codes' });
  }
});

/**
 * POST /api/admin/promo-codes
 * Create promo code
 */
router.post('/promo-codes', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const { code, description, discount_type, discount_value, applies_to, max_uses, min_purchase, expiration_date } = req.body;

    // Check if code exists
    const existing = await db.collection('promo_codes').findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ detail: 'Promo code already exists' });
    }

    const promoCode = {
      id: generateId(),
      code: code.toUpperCase(),
      description: description || '',
      discount_type: discount_type || 'percentage',
      discount_value: parseFloat(discount_value) || 0,
      applies_to: applies_to || 'pro_mode',
      max_uses: max_uses || null,
      current_uses: 0,
      min_purchase: parseFloat(min_purchase) || 0,
      expiration_date: expiration_date || null,
      is_active: true,
      created_by: req.user.id,
      created_at: nowISO()
    };

    await db.collection('promo_codes').insertOne(promoCode);
    res.status(201).json(sanitizeDoc(promoCode));
  } catch (error) {
    console.error('Create promo code error:', error);
    res.status(500).json({ detail: 'Failed to create promo code' });
  }
});

/**
 * PUT /api/admin/promo-codes/:promoId
 * Update promo code
 */
router.put('/promo-codes/:promoId', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const updates = {};
    
    const allowedFields = ['description', 'discount_type', 'discount_value', 'max_uses', 'min_purchase', 'expiration_date', 'is_active'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const result = await db.collection('promo_codes').updateOne(
      { id: req.params.promoId },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ detail: 'Promo code not found' });
    }

    const updated = await db.collection('promo_codes').findOne({ id: req.params.promoId }, { projection: { _id: 0 } });
    res.json(updated);
  } catch (error) {
    console.error('Update promo code error:', error);
    res.status(500).json({ detail: 'Failed to update promo code' });
  }
});

/**
 * DELETE /api/admin/promo-codes/:promoId
 * Delete promo code
 */
router.delete('/promo-codes/:promoId', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    await db.collection('promo_codes').deleteOne({ id: req.params.promoId });
    res.json({ message: 'Promo code deleted successfully' });
  } catch (error) {
    console.error('Delete promo code error:', error);
    res.status(500).json({ detail: 'Failed to delete promo code' });
  }
});

/**
 * GET /api/admin/about
 * Get platform about info
 */
router.get('/about', async (req, res) => {
  try {
    const db = getDB();
    const about = await db.collection('platform_settings').findOne({ type: 'about' }, { projection: { _id: 0 } });
    
    res.json(about || {
      description: '',
      phone: '',
      email: '',
      socialLinks: { facebook: '', twitter: '', instagram: '', youtube: '' },
      termsUrl: '',
      privacyUrl: ''
    });
  } catch (error) {
    console.error('Get about error:', error);
    res.status(500).json({ detail: 'Failed to fetch about info' });
  }
});

/**
 * PUT /api/admin/about
 * Update platform about info
 */
router.put('/about', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    
    await db.collection('platform_settings').updateOne(
      { type: 'about' },
      { $set: { ...req.body, type: 'about', updated_at: nowISO() } },
      { upsert: true }
    );

    res.json({ message: 'About info updated successfully' });
  } catch (error) {
    console.error('Update about error:', error);
    res.status(500).json({ detail: 'Failed to update about info' });
  }
});

module.exports = router;
