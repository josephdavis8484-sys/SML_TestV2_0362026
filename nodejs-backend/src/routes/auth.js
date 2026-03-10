/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getDB } = require('../services/database');
const { requireAuth, generateSessionToken } = require('../middleware/auth');
const { generateId, nowISO, addDays, sanitizeDoc } = require('../utils/helpers');

const EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data";
const SESSION_DURATION_DAYS = parseInt(process.env.SESSION_DURATION_DAYS) || 7;

/**
 * POST /api/auth/session
 * Create session from Emergent OAuth
 */
router.post('/session', async (req, res) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ detail: 'session_id is required' });
    }

    // Verify with Emergent auth service
    const authResponse = await axios.get(EMERGENT_AUTH_URL, {
      headers: { 'X-Session-ID': session_id },
      timeout: 10000
    });

    const authData = authResponse.data;
    const db = getDB();

    // Check if user exists
    let user = await db.collection('users').findOne(
      { email: authData.email },
      { projection: { _id: 0 } }
    );

    if (user) {
      // Update existing user
      await db.collection('users').updateOne(
        { email: authData.email },
        { $set: { name: authData.name, picture: authData.picture } }
      );
    } else {
      // Create new user
      user = {
        id: authData.id || generateId(),
        email: authData.email,
        name: authData.name,
        picture: authData.picture || null,
        role: null,
        stripe_account_id: null,
        bank_linked: false,
        onboarding_completed: false,
        is_blocked: false,
        created_at: nowISO()
      };
      await db.collection('users').insertOne(user);
    }

    // Create session
    const sessionToken = authData.session_token || generateSessionToken(user.id);
    const expiresAt = addDays(SESSION_DURATION_DAYS);

    await db.collection('user_sessions').insertOne({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      created_at: nowISO()
    });

    // Set cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({ user: sanitizeDoc(user), session_token: sessionToken });
  } catch (error) {
    console.error('Auth session error:', error);
    if (error.response?.status === 401) {
      return res.status(401).json({ detail: 'Invalid session ID' });
    }
    res.status(500).json({ detail: 'Authentication failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

/**
 * POST /api/auth/role
 * Set user role (viewer or creator)
 */
router.post('/role', requireAuth, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['viewer', 'creator'].includes(role)) {
      return res.status(400).json({ detail: 'Invalid role. Must be "viewer" or "creator"' });
    }

    const db = getDB();
    await db.collection('users').updateOne(
      { id: req.user.id },
      { $set: { role } }
    );

    req.user.role = role;
    res.json(req.user);
  } catch (error) {
    console.error('Set role error:', error);
    res.status(500).json({ detail: 'Failed to set role' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', async (req, res) => {
  try {
    const sessionToken = req.cookies?.session_token || 
                         req.headers.authorization?.replace('Bearer ', '');
    
    if (sessionToken) {
      const db = getDB();
      await db.collection('user_sessions').deleteOne({ session_token: sessionToken });
    }

    res.clearCookie('session_token', { path: '/' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ detail: 'Logout failed' });
  }
});

module.exports = router;
