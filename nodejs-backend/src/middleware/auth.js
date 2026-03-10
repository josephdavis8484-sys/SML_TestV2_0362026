/**
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const { getDB } = require('../services/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Extract session token from request
 */
function getSessionToken(req) {
  // Check cookie first
  if (req.cookies?.session_token) {
    return req.cookies.session_token;
  }
  
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Middleware to require authentication
 */
async function requireAuth(req, res, next) {
  try {
    const sessionToken = getSessionToken(req);
    
    if (!sessionToken) {
      return res.status(401).json({ detail: 'Not authenticated' });
    }

    const db = getDB();
    const session = await db.collection('user_sessions').findOne({
      session_token: sessionToken,
      expires_at: { $gt: new Date().toISOString() }
    });

    if (!session) {
      return res.status(401).json({ detail: 'Invalid or expired session' });
    }

    const user = await db.collection('users').findOne(
      { id: session.user_id },
      { projection: { _id: 0 } }
    );

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ detail: 'Account is blocked', reason: user.block_reason });
    }

    // Attach user to request
    req.user = user;
    req.sessionToken = sessionToken;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ detail: 'Authentication error' });
  }
}

/**
 * Middleware to require admin role
 */
async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ detail: 'Admin access required' });
    }
    next();
  });
}

/**
 * Middleware to require creator role
 */
async function requireCreator(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'creator') {
      return res.status(403).json({ detail: 'Creator access required' });
    }
    next();
  });
}

/**
 * Optional auth - attaches user if authenticated, continues if not
 */
async function optionalAuth(req, res, next) {
  try {
    const sessionToken = getSessionToken(req);
    
    if (sessionToken) {
      const db = getDB();
      const session = await db.collection('user_sessions').findOne({
        session_token: sessionToken,
        expires_at: { $gt: new Date().toISOString() }
      });

      if (session) {
        const user = await db.collection('users').findOne(
          { id: session.user_id },
          { projection: { _id: 0 } }
        );
        if (user && !user.is_blocked) {
          req.user = user;
          req.sessionToken = sessionToken;
        }
      }
    }
    next();
  } catch (error) {
    // Continue without auth on error
    next();
  }
}

/**
 * Generate a session token
 */
function generateSessionToken(userId) {
  return jwt.sign(
    { userId, timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: `${process.env.SESSION_DURATION_DAYS || 7}d` }
  );
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireCreator,
  optionalAuth,
  getSessionToken,
  generateSessionToken
};
