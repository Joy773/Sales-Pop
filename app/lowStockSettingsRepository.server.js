import clientPromise from './db.mongo.server.js';

const DB_NAME = 'salespop';
const COLLECTION_NAME = 'low_stock_settings';

function normalizeShop(shop) {
  if (!shop || typeof shop !== 'string') {
    throw new Error('Shop domain is required to load or save low stock settings');
  }
  return shop.trim().toLowerCase();
}

/**
 * Get low stock settings for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @returns {Promise<Object|null>} The settings configuration or null if not found
 */
export async function getLowStockSettings(shop) {
  const normalizedShop = normalizeShop(shop);
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  const existing = await collection.findOne({ shop: normalizedShop });
  console.log(`[Low Stock Settings Repo] Getting settings for shop: ${normalizedShop}`, {
    found: !!existing,
    hasSettings: !!existing?.settings,
    settingsKeys: existing?.settings ? Object.keys(existing.settings) : [],
    enabled: existing?.enabled
  });
  
  if (!existing) {
    console.log(`[Low Stock Settings Repo] No settings found for shop: ${normalizedShop}`);
    return null;
  }

  return existing.settings || {};
}

/**
 * Save low stock settings for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @param {Object} settings - The settings configuration object
 * @returns {Promise<Object>} The saved settings
 */
export async function saveLowStockSettings(shop, settings) {
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

  console.log(`[Low Stock Settings Repo] Saving settings for shop: ${normalizedShop}`, {
    settingsKeys: Object.keys(settings),
    settings: settings
  });

  const result = await collection.updateOne(
    { shop: normalizedShop },
    { $set: document },
    { upsert: true }
  );

  console.log(`[Low Stock Settings Repo] Settings saved for shop: ${normalizedShop}`, {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount
  });

  return document.settings;
}

/**
 * Check if low stock campaign is enabled for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @returns {Promise<boolean>} True if enabled, false otherwise
 */
export async function getLowStockEnabled(shop) {
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
    console.error('[Low Stock Settings Repo] Error getting enabled state:', error);
    return false;
  }
}

/**
 * Set low stock campaign enabled/disabled state for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @param {boolean} enabled - Whether the campaign should be enabled
 * @returns {Promise<boolean>} True if successful
 */
export async function setLowStockEnabled(shop, enabled) {
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
    console.error('[Low Stock Settings Repo] Error setting enabled state:', error);
    throw error;
  }
}

/**
 * Check if low stock settings exist for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @returns {Promise<boolean>} True if settings exist, false otherwise
 */
export async function checkLowStockSettingsExist(shop) {
  try {
    const normalizedShop = normalizeShop(shop);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const count = await collection.countDocuments({ shop: normalizedShop });
    return count > 0;
  } catch (error) {
    console.error('[Low Stock Settings Repo] Error checking if settings exist:', error);
    return false;
  }
}

