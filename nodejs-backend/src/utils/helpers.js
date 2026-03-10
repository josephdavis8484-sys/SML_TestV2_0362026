/**
 * Utility Functions
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique ID
 */
function generateId() {
  return uuidv4();
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @returns Distance in meters
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);
  
  const a = Math.sin(deltaPhi / 2) ** 2 + 
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr) {
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
    /^\w+ \d{1,2}, \d{4}$/,          // Month DD, YYYY
    /^\w{3} \d{1,2}, \d{4}$/,        // Mon DD, YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/      // MM/DD/YYYY
  ];
  
  for (const format of formats) {
    if (format.test(dateStr)) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}

/**
 * Exclude fields from an object
 */
function excludeFields(obj, fields) {
  const result = { ...obj };
  fields.forEach(field => delete result[field]);
  return result;
}

/**
 * Sanitize MongoDB document (remove _id)
 */
function sanitizeDoc(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

/**
 * Sanitize array of documents
 */
function sanitizeDocs(docs) {
  return docs.map(sanitizeDoc);
}

/**
 * Get current ISO timestamp
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Add days to current date
 */
function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Generate random token
 */
function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  generateId,
  calculateDistanceMeters,
  parseDate,
  excludeFields,
  sanitizeDoc,
  sanitizeDocs,
  nowISO,
  addDays,
  generateToken,
  isValidEmail
};
