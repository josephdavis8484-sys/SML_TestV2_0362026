/**
 * Event Routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');
const { getDB } = require('../services/database');
const { requireAuth, requireCreator, optionalAuth } = require('../middleware/auth');
const { generateId, nowISO, parseDate, sanitizeDoc, sanitizeDocs } = require('../utils/helpers');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${generateId()}${ext}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 }
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * GET /api/events
 * Get all upcoming/live events
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const events = await db.collection('events').find({
      status: { $in: ['upcoming', 'live'] },
      is_blocked: { $ne: true }
    }, { projection: { _id: 0 } }).toArray();

    // Filter valid events
    const validEvents = events.filter(event => {
      const eventDate = parseDate(event.date);
      if (!eventDate) return true; // Include if can't parse
      return eventDate >= weekAgo;
    });

    // Sort by date
    validEvents.sort((a, b) => {
      const dateA = parseDate(a.date) || new Date(0);
      const dateB = parseDate(b.date) || new Date(0);
      return dateA - dateB;
    });

    res.json(validEvents);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ detail: 'Failed to fetch events' });
  }
});

/**
 * GET /api/events/search/location
 * Search events by city/state
 */
router.get('/search/location', async (req, res) => {
  try {
    const { city, state, country = 'US' } = req.query;
    const db = getDB();

    const query = {
      status: { $nin: ['cancelled'] },
      is_blocked: { $ne: true }
    };

    if (city) query.city = { $regex: city, $options: 'i' };
    if (state) query.state = { $regex: state, $options: 'i' };
    if (country) query.country = country.toUpperCase();

    const events = await db.collection('events').find(query, { projection: { _id: 0 } })
      .limit(100).toArray();

    // Filter expired events
    const today = new Date();
    const validEvents = events.filter(event => {
      const eventDate = parseDate(event.date);
      return !eventDate || eventDate >= today;
    });

    res.json({
      events: validEvents,
      count: validEvents.length,
      filters: { city, state, country }
    });
  } catch (error) {
    console.error('Search events error:', error);
    res.status(500).json({ detail: 'Failed to search events' });
  }
});

/**
 * GET /api/events/locations
 * Get unique cities and states
 */
router.get('/locations', async (req, res) => {
  try {
    const db = getDB();
    
    const pipeline = [
      { $match: { status: { $nin: ['cancelled'] }, is_blocked: { $ne: true } } },
      { $group: {
        _id: { city: { $ifNull: ['$city', ''] }, state: { $ifNull: ['$state', ''] } },
        count: { $sum: 1 }
      }},
      { $match: { '_id.city': { $ne: '' } } },
      { $sort: { count: -1 } }
    ];

    const locations = await db.collection('events').aggregate(pipeline).toArray();

    const cities = [];
    const states = new Set();

    locations.forEach(loc => {
      if (loc._id.city) {
        cities.push({
          city: loc._id.city,
          state: loc._id.state,
          event_count: loc.count
        });
      }
      if (loc._id.state) {
        states.add(loc._id.state);
      }
    });

    res.json({ cities, states: Array.from(states) });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ detail: 'Failed to fetch locations' });
  }
});

/**
 * GET /api/events/creator/my-events
 * Get creator's events
 */
router.get('/creator/my-events', requireCreator, async (req, res) => {
  try {
    const db = getDB();
    const events = await db.collection('events').find(
      { creator_id: req.user.id },
      { projection: { _id: 0 } }
    ).toArray();

    res.json(events);
  } catch (error) {
    console.error('Get my events error:', error);
    res.status(500).json({ detail: 'Failed to fetch events' });
  }
});

/**
 * GET /api/events/:eventId
 * Get single event
 */
router.get('/:eventId', async (req, res) => {
  try {
    const db = getDB();
    const event = await db.collection('events').findOne(
      { id: req.params.eventId },
      { projection: { _id: 0 } }
    );

    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ detail: 'Failed to fetch event' });
  }
});

/**
 * POST /api/events/upload-image
 * Upload event image
 */
router.post('/upload-image', requireCreator, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ detail: 'No file uploaded' });
  }
  res.json({ image_url: `/api/uploads/${req.file.filename}` });
});

/**
 * POST /api/events
 * Create new event
 */
router.post('/', requireCreator, async (req, res) => {
  try {
    const db = getDB();
    const eventId = generateId();
    const shareLink = `${FRONTEND_URL}/event/${eventId}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(shareLink, {
      color: { dark: '#0000FF', light: '#FFFFFF' }
    });

    const event = {
      id: eventId,
      creator_id: req.user.id,
      title: req.body.title,
      category: req.body.category,
      date: req.body.date,
      start_time: req.body.start_time || '',
      end_time: req.body.end_time || '',
      time: req.body.time || '7:00 PM',
      description: req.body.description,
      venue: req.body.venue,
      city: req.body.city || '',
      state: req.body.state || '',
      country: req.body.country || 'US',
      latitude: req.body.latitude || null,
      longitude: req.body.longitude || null,
      price: parseFloat(req.body.price) || 0,
      image_url: req.body.image_url || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=600&fit=crop',
      streaming_package: req.body.streaming_package || 'free',
      chat_enabled: req.body.chat_enabled !== false,
      reactions_enabled: req.body.reactions_enabled !== false,
      chat_mode: req.body.chat_mode || 'open',
      geo_restricted: req.body.geo_restricted || false,
      geo_radius_meters: req.body.geo_radius_meters || 1000,
      status: 'upcoming',
      is_blocked: false,
      total_revenue: 0,
      payout_processed: false,
      share_link: shareLink,
      qr_code: qrCodeDataUrl,
      created_at: nowISO()
    };

    await db.collection('events').insertOne(event);
    res.status(201).json(sanitizeDoc(event));
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ detail: 'Failed to create event' });
  }
});

/**
 * DELETE /api/events/creator/:eventId
 * Delete creator's event
 */
router.delete('/creator/:eventId', requireCreator, async (req, res) => {
  try {
    const db = getDB();
    const event = await db.collection('events').findOne({
      id: req.params.eventId,
      creator_id: req.user.id
    });

    if (!event) {
      return res.status(404).json({ detail: 'Event not found or you don\'t own this event' });
    }

    if (event.status === 'live') {
      return res.status(400).json({ detail: 'Cannot delete a live event. Please end the stream first.' });
    }

    await db.collection('events').deleteOne({ id: req.params.eventId });
    await db.collection('tickets').deleteMany({ event_id: req.params.eventId });

    res.json({ message: 'Event deleted successfully', event_id: req.params.eventId });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ detail: 'Failed to delete event' });
  }
});

/**
 * POST /api/events/:eventId/go-live
 * Start live streaming
 */
router.post('/:eventId/go-live', requireCreator, async (req, res) => {
  try {
    const db = getDB();
    const event = await db.collection('events').findOne({
      id: req.params.eventId,
      creator_id: req.user.id
    });

    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    await db.collection('events').updateOne(
      { id: req.params.eventId },
      { $set: { status: 'live' } }
    );

    // Find ticket holders to notify
    const tickets = await db.collection('tickets').find(
      { event_id: req.params.eventId },
      { projection: { user_id: 1 } }
    ).toArray();

    const userIds = [...new Set(tickets.map(t => t.user_id))];

    // Create notifications
    for (const userId of userIds) {
      await db.collection('notifications').insertOne({
        id: generateId(),
        user_id: userId,
        type: 'event_live',
        title: '🔴 Event is Live!',
        message: `${event.title} has started streaming!`,
        event_id: req.params.eventId,
        read: false,
        data: { event_title: event.title },
        created_at: nowISO()
      });
    }

    res.json({ 
      message: 'Event is now live', 
      notified_count: userIds.length 
    });
  } catch (error) {
    console.error('Go live error:', error);
    res.status(500).json({ detail: 'Failed to go live' });
  }
});

/**
 * POST /api/events/:eventId/end
 * End live streaming
 */
router.post('/:eventId/end', requireCreator, async (req, res) => {
  try {
    const db = getDB();
    
    await db.collection('events').updateOne(
      { id: req.params.eventId, creator_id: req.user.id },
      { $set: { status: 'completed' } }
    );

    res.json({ message: 'Event ended successfully' });
  } catch (error) {
    console.error('End event error:', error);
    res.status(500).json({ detail: 'Failed to end event' });
  }
});

/**
 * POST /api/events/:eventId/cancel
 * Cancel event with refunds
 */
router.post('/:eventId/cancel', requireCreator, async (req, res) => {
  try {
    const { reason } = req.body;
    const db = getDB();

    const event = await db.collection('events').findOne({
      id: req.params.eventId,
      creator_id: req.user.id
    });

    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    // Update event status
    await db.collection('events').updateOne(
      { id: req.params.eventId },
      { 
        $set: { 
          status: 'cancelled',
          cancelled_at: nowISO(),
          cancellation_reason: reason || 'Cancelled by creator'
        } 
      }
    );

    // Mark all tickets as refunded
    const result = await db.collection('tickets').updateMany(
      { event_id: req.params.eventId, refunded: false },
      { 
        $set: { 
          refunded: true,
          refund_reason: reason || 'Event cancelled',
          refund_date: nowISO()
        } 
      }
    );

    res.json({ 
      message: 'Event cancelled', 
      refunded_tickets: result.modifiedCount 
    });
  } catch (error) {
    console.error('Cancel event error:', error);
    res.status(500).json({ detail: 'Failed to cancel event' });
  }
});

module.exports = router;
