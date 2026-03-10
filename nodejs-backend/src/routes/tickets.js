/**
 * Ticket Routes
 */

const express = require('express');
const router = express.Router();
const ical = require('ical-generator').default;
const { getDB } = require('../services/database');
const { requireAuth } = require('../middleware/auth');
const { generateId, nowISO, sanitizeDoc } = require('../utils/helpers');

/**
 * GET /api/tickets
 * Get user's tickets
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const tickets = await db.collection('tickets').find(
      { user_id: req.user.id },
      { projection: { _id: 0 } }
    ).toArray();

    res.json(tickets);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ detail: 'Failed to fetch tickets' });
  }
});

/**
 * POST /api/tickets
 * Purchase ticket
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { event_id, quantity = 1 } = req.body;
    const db = getDB();

    const event = await db.collection('events').findOne({ id: event_id });
    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    const amountPaid = parseFloat(event.price) * quantity;

    const ticket = {
      id: generateId(),
      event_id,
      user_id: req.user.id,
      quantity,
      amount_paid: amountPaid,
      refunded: false,
      purchase_date: nowISO()
    };

    await db.collection('tickets').insertOne(ticket);
    res.status(201).json(sanitizeDoc(ticket));
  } catch (error) {
    console.error('Purchase ticket error:', error);
    res.status(500).json({ detail: 'Failed to purchase ticket' });
  }
});

/**
 * DELETE /api/tickets/:ticketId
 * Delete ticket
 */
router.delete('/:ticketId', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    
    const ticket = await db.collection('tickets').findOne({
      id: req.params.ticketId,
      user_id: req.user.id
    });

    if (!ticket) {
      return res.status(404).json({ detail: 'Ticket not found or you don\'t own this ticket' });
    }

    // Check if event is live
    const event = await db.collection('events').findOne({ id: ticket.event_id });
    if (event && event.status === 'live') {
      return res.status(400).json({ detail: 'Cannot delete ticket for a live event' });
    }

    await db.collection('tickets').deleteOne({ id: req.params.ticketId });
    res.json({ message: 'Ticket deleted successfully', ticket_id: req.params.ticketId });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ detail: 'Failed to delete ticket' });
  }
});

/**
 * GET /api/tickets/:ticketId/calendar
 * Download calendar file
 */
router.get('/:ticketId/calendar', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    
    const ticket = await db.collection('tickets').findOne({
      id: req.params.ticketId,
      user_id: req.user.id
    });

    if (!ticket) {
      return res.status(404).json({ detail: 'Ticket not found' });
    }

    const event = await db.collection('events').findOne({ id: ticket.event_id });
    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    // Create calendar
    const cal = ical({ name: 'ShowMeLive Events' });

    // Parse event datetime
    let startDate = new Date();
    try {
      const dateStr = `${event.date} ${event.time || event.start_time || '19:00'}`;
      startDate = new Date(dateStr);
      if (isNaN(startDate.getTime())) {
        startDate = new Date(event.date);
      }
    } catch (e) {
      // Use current date as fallback
    }

    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    cal.createEvent({
      start: startDate,
      end: endDate,
      summary: event.title,
      description: `${event.description}\n\nTicket Quantity: ${ticket.quantity}\n\nEvent URL: ${event.share_link || ''}`,
      location: event.venue,
      url: event.share_link,
      categories: [{ name: event.category }],
      alarms: [
        { type: 'display', trigger: 24 * 60 * 60 } // 1 day before
      ]
    });

    res.set('Content-Type', 'text/calendar');
    res.set('Content-Disposition', `attachment; filename="${event.title.replace(/\s+/g, '_')}.ics"`);
    res.send(cal.toString());
  } catch (error) {
    console.error('Calendar download error:', error);
    res.status(500).json({ detail: 'Failed to generate calendar' });
  }
});

module.exports = router;
