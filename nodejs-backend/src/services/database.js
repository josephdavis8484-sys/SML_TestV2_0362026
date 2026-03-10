/**
 * MongoDB Database Connection Service
 */

const { MongoClient } = require('mongodb');

let db = null;
let client = null;

async function connectDB() {
  if (db) return db;

  const mongoUrl = process.env.MONGO_URL;
  const dbName = process.env.DB_NAME || 'showmelive';

  if (!mongoUrl) {
    throw new Error('MONGO_URL environment variable is required');
  }

  client = new MongoClient(mongoUrl);
  await client.connect();
  db = client.db(dbName);

  // Create indexes for better performance
  await createIndexes(db);

  return db;
}

async function createIndexes(database) {
  try {
    // Users collection indexes
    await database.collection('users').createIndex({ email: 1 }, { unique: true });
    await database.collection('users').createIndex({ id: 1 }, { unique: true });

    // Events collection indexes
    await database.collection('events').createIndex({ id: 1 }, { unique: true });
    await database.collection('events').createIndex({ creator_id: 1 });
    await database.collection('events').createIndex({ status: 1 });
    await database.collection('events').createIndex({ date: 1 });
    await database.collection('events').createIndex({ city: 1, state: 1 });

    // Tickets collection indexes
    await database.collection('tickets').createIndex({ id: 1 }, { unique: true });
    await database.collection('tickets').createIndex({ user_id: 1 });
    await database.collection('tickets').createIndex({ event_id: 1 });

    // Sessions collection indexes
    await database.collection('user_sessions').createIndex({ session_token: 1 }, { unique: true });
    await database.collection('user_sessions').createIndex({ user_id: 1 });
    await database.collection('user_sessions').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

    // Payment transactions
    await database.collection('payment_transactions').createIndex({ session_id: 1 });
    await database.collection('payment_transactions').createIndex({ user_id: 1 });

    // Promo codes
    await database.collection('promo_codes').createIndex({ code: 1 }, { unique: true });

    // Notifications
    await database.collection('notifications').createIndex({ user_id: 1 });
    await database.collection('notifications').createIndex({ created_at: -1 });

    // Pro Mode sessions
    await database.collection('pro_mode_sessions').createIndex({ event_id: 1 });
    await database.collection('pro_mode_sessions').createIndex({ connection_token: 1 });

    // Security events
    await database.collection('security_events').createIndex({ user_id: 1 });
    await database.collection('security_events').createIndex({ event_id: 1 });

    console.log('✅ Database indexes created');
  } catch (error) {
    console.warn('⚠️ Some indexes may already exist:', error.message);
  }
}

function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    db = null;
    client = null;
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB
};
