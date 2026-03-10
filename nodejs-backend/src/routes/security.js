/**
 * Security Routes (Privacy Protection)
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../services/database');
const { requireAuth } = require('../middleware/auth');
const { generateId, nowISO, sanitizeDoc } = require('../utils/helpers');

// Violation thresholds
const VIOLATION_THRESHOLDS = {
  warning: 3,
  session_termination: 5,
  account_suspension: 10
};

/**
 * POST /api/security/report-violation
 * Report a security violation (e.g., screen capture attempt)
 */
router.post('/report-violation', requireAuth, async (req, res) => {
  try {
    const { event_id, capture_type, severity = 'low', details = {} } = req.body;
    const db = getDB();

    // Log the security event
    const securityEvent = {
      id: generateId(),
      user_id: req.user.id,
      event_id,
      capture_type,
      severity,
      details,
      user_agent: req.headers['user-agent'],
      ip_address: req.ip || req.connection?.remoteAddress,
      created_at: nowISO()
    };

    await db.collection('security_events').insertOne(securityEvent);

    // Update user's security status
    let userStatus = await db.collection('user_security_status').findOne({
      user_id: req.user.id
    });

    if (!userStatus) {
      userStatus = {
        user_id: req.user.id,
        violation_count: 0,
        last_violation_at: null,
        is_suspended: false,
        created_at: nowISO()
      };
      await db.collection('user_security_status').insertOne(userStatus);
    }

    // Increment violation count
    const newCount = userStatus.violation_count + 1;
    
    await db.collection('user_security_status').updateOne(
      { user_id: req.user.id },
      {
        $set: {
          violation_count: newCount,
          last_violation_at: nowISO()
        }
      }
    );

    // Determine enforcement action
    let action = 'logged';
    let can_continue = true;

    if (newCount >= VIOLATION_THRESHOLDS.account_suspension) {
      action = 'account_suspended';
      can_continue = false;
      
      await db.collection('user_security_status').updateOne(
        { user_id: req.user.id },
        { $set: { is_suspended: true, suspended_at: nowISO() } }
      );
      
      await db.collection('users').updateOne(
        { id: req.user.id },
        { $set: { is_blocked: true, block_reason: 'Security violation: Multiple capture attempts' } }
      );
    } else if (newCount >= VIOLATION_THRESHOLDS.session_termination) {
      action = 'session_terminated';
      can_continue = false;
    } else if (newCount >= VIOLATION_THRESHOLDS.warning) {
      action = 'warning';
      can_continue = true;
    }

    res.json({
      event_logged: true,
      violation_count: newCount,
      enforcement_action: action,
      can_continue,
      message: action === 'warning' 
        ? 'Warning: Screen recording detected. Further attempts may result in account suspension.'
        : action === 'session_terminated'
        ? 'Your session has been terminated due to multiple security violations.'
        : action === 'account_suspended'
        ? 'Your account has been suspended due to security violations.'
        : 'Violation logged.'
    });
  } catch (error) {
    console.error('Report violation error:', error);
    res.status(500).json({ detail: 'Failed to report violation' });
  }
});

/**
 * GET /api/security/status
 * Get user's security status
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    
    const status = await db.collection('user_security_status').findOne(
      { user_id: req.user.id },
      { projection: { _id: 0 } }
    );

    res.json(status || {
      user_id: req.user.id,
      violation_count: 0,
      is_suspended: false
    });
  } catch (error) {
    console.error('Get security status error:', error);
    res.status(500).json({ detail: 'Failed to get security status' });
  }
});

/**
 * GET /api/security/check-status
 * Quick check if user can access content
 */
router.get('/check-status', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    
    const status = await db.collection('user_security_status').findOne({
      user_id: req.user.id
    });

    const canAccess = !status?.is_suspended && !req.user.is_blocked;

    res.json({
      can_access: canAccess,
      is_suspended: status?.is_suspended || false,
      violation_count: status?.violation_count || 0
    });
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({ detail: 'Failed to check status' });
  }
});

module.exports = router;
