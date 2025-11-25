import clientPromise from './db.mongo.server.js';

const DB_NAME = 'salespop';
const COLLECTION_NAME = 'cart_countdown_settings';

function normalizeShop(shop) {
  if (!shop || typeof shop !== 'string') {
    throw new Error('Shop domain is required to load or save cart countdown settings');
  }
  return shop.trim().toLowerCase();
}

export async function getCartCountdownSettings(shop) {
  const normalizedShop = normalizeShop(shop);
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  const existing = await collection.findOne({ shop: normalizedShop });
  if (!existing) {
    return null;
  }

  return existing.settings || {};
}

export async function saveCartCountdownSettings(shop, settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('Settings must be a valid object');
  }

  const normalizedShop = normalizeShop(shop);
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  const document = {
    shop: normalizedShop,
    settings: settings,
    updatedAt: new Date(),
  };

  await collection.updateOne(
    { shop: normalizedShop },
    { $set: document },
    { upsert: true }
  );

  return document.settings;
}

export async function getCartCountdownEnabled(shop) {
  try {
    const normalizedShop = normalizeShop(shop);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const existing = await collection.findOne({ shop: normalizedShop });
    if (!existing) {
      return false;
    }

    return existing.enabled !== undefined ? existing.enabled : true; // Default to true if not set
  } catch (error) {
    console.error('[Cart Countdown Repo] Error getting enabled state:', error);
    return false;
  }
}

export async function setCartCountdownEnabled(shop, enabled) {
  try {
    const normalizedShop = normalizeShop(shop);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    await collection.updateOne(
      { shop: normalizedShop },
      { $set: { enabled: enabled, updatedAt: new Date() } },
      { upsert: true }
    );

    return true;
  } catch (error) {
    console.error('[Cart Countdown Repo] Error setting enabled state:', error);
    throw error;
  }
}

