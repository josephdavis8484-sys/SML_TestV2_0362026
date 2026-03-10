/**
 * Payment Routes (Stripe)
 */

const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { getDB } = require('../services/database');
const { requireAuth } = require('../middleware/auth');
const { generateId, nowISO } = require('../utils/helpers');

const stripe = new Stripe(process.env.STRIPE_API_KEY);
const PLATFORM_FEE_PERCENTAGE = parseInt(process.env.PLATFORM_FEE_PERCENTAGE) || 20;
const STREAMING_PACKAGES = { free: 0, premium: parseFloat(process.env.PRO_MODE_FEE) || 1000 };

/**
 * POST /api/payments/checkout/session
 * Create Stripe checkout session
 */
router.post('/checkout/session', requireAuth, async (req, res) => {
  try {
    const { payment_type, origin_url, event_id, quantity = 1, package: pkg } = req.body;

    if (!origin_url) {
      return res.status(400).json({ detail: 'origin_url is required' });
    }

    const db = getDB();
    let amount = 0;
    let description = '';
    const metadata = {
      user_id: req.user.id,
      payment_type
    };

    if (payment_type === 'streaming_package') {
      if (!STREAMING_PACKAGES[pkg]) {
        return res.status(400).json({ detail: 'Invalid package' });
      }
      amount = STREAMING_PACKAGES[pkg];
      description = `ShowMeLive ${pkg} Streaming Package`;
      metadata.package = pkg;
      metadata.event_id = event_id || '';
    } else if (payment_type === 'ticket') {
      const event = await db.collection('events').findOne({ id: event_id });
      if (!event) {
        return res.status(404).json({ detail: 'Event not found' });
      }
      amount = parseFloat(event.price) * quantity;
      description = `Ticket for ${event.title} (x${quantity})`;
      metadata.event_id = event_id;
      metadata.quantity = String(quantity);
    } else {
      return res.status(400).json({ detail: 'Invalid payment_type' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: description },
          unit_amount: Math.round(amount * 100) // Stripe uses cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${origin_url}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin_url}/payment-cancel`,
      metadata
    });

    // Store transaction
    await db.collection('payment_transactions').insertOne({
      id: generateId(),
      session_id: session.id,
      user_id: req.user.id,
      event_id: metadata.event_id || null,
      amount,
      currency: 'usd',
      payment_type,
      payment_status: 'pending',
      metadata,
      created_at: nowISO()
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ detail: 'Failed to create checkout session' });
  }
});

/**
 * GET /api/payments/checkout/status/:sessionId
 * Check checkout status
 */
router.get('/checkout/status/:sessionId', requireAuth, async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    const db = getDB();

    const transaction = await db.collection('payment_transactions').findOne({
      session_id: req.params.sessionId
    });

    if (transaction && transaction.payment_status !== 'completed' && session.payment_status === 'paid') {
      // Update transaction
      await db.collection('payment_transactions').updateOne(
        { session_id: req.params.sessionId },
        { $set: { payment_status: 'completed' } }
      );

      // Process based on payment type
      if (transaction.payment_type === 'ticket') {
        const ticketData = {
          id: generateId(),
          event_id: transaction.metadata.event_id,
          user_id: req.user.id,
          quantity: parseInt(transaction.metadata.quantity) || 1,
          amount_paid: transaction.amount,
          refunded: false,
          purchase_date: nowISO()
        };
        await db.collection('tickets').insertOne(ticketData);

        // Update event revenue
        await db.collection('events').updateOne(
          { id: transaction.metadata.event_id },
          { $inc: { total_revenue: transaction.amount } }
        );
      } else if (transaction.payment_type === 'streaming_package' || transaction.payment_type === 'pro_mode_unlock') {
        if (transaction.metadata.event_id) {
          await db.collection('events').updateOne(
            { id: transaction.metadata.event_id },
            { $set: { streaming_package: 'premium' } }
          );
        }
      }
    }

    res.json({
      payment_status: session.payment_status,
      amount_total: session.amount_total / 100,
      currency: session.currency
    });
  } catch (error) {
    console.error('Checkout status error:', error);
    res.status(500).json({ detail: 'Failed to get checkout status' });
  }
});

/**
 * POST /api/payments/webhook/stripe
 * Stripe webhook handler
 */
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    let event;
    
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Payment completed:', session.id);
        // Payment processing is handled in /checkout/status endpoint
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

/**
 * GET /api/payments/creator/earnings
 * Get creator earnings
 */
router.get('/creator/earnings', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({ detail: 'Only creators can view earnings' });
    }

    const db = getDB();
    const events = await db.collection('events').find(
      { creator_id: req.user.id },
      { projection: { _id: 0 } }
    ).toArray();

    const totalRevenue = events.reduce((sum, e) => sum + (e.total_revenue || 0), 0);
    const platformFee = totalRevenue * (PLATFORM_FEE_PERCENTAGE / 100);
    const creatorEarnings = totalRevenue - platformFee;
    const pendingPayout = events
      .filter(e => !e.payout_processed)
      .reduce((sum, e) => sum + ((e.total_revenue || 0) * (1 - PLATFORM_FEE_PERCENTAGE / 100)), 0);

    res.json({
      total_revenue: totalRevenue,
      platform_fee: platformFee,
      creator_earnings: creatorEarnings,
      pending_payout: pendingPayout,
      events
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ detail: 'Failed to fetch earnings' });
  }
});

module.exports = router;
