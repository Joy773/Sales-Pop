import clientPromise from './db.mongo.server.js';

const DB_NAME = 'salespop';
const COLLECTION_NAME = 'banner_subscriptions';

function normalizeShop(shop) {
  if (!shop || typeof shop !== 'string') {
    throw new Error('Shop domain is required to save banner subscriptions');
  }
  return shop.trim().toLowerCase();
}

/**
 * Save a banner popup subscription (email only)
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @param {Object} subscriptionData - The subscription data
 * @param {string} subscriptionData.email - Email address (required)
 * @param {string} subscriptionData.subscriptionType - Always 'email' (phone support removed)
 * @param {string} subscriptionData.popupType - Popup type from goal.popupSelection (e.g., 'collect-email', 'subscribe-discount', 'offer-discount')
 * @param {string} subscriptionData.template - Template from styles.selectedTemplate (e.g., 'template-1')
 * @returns {Promise<Object>} The saved subscription document
 */
export async function saveBannerSubscription(shop, subscriptionData) {
  try {
    const normalizedShop = normalizeShop(shop);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Validate subscription data
    if (!subscriptionData || typeof subscriptionData !== 'object') {
      throw new Error('Subscription data must be a valid object');
    }

    const { email, popupType, template } = subscriptionData;

    // Validate email is provided
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      throw new Error('Email is required');
    }

    // Create subscription document (email only, phone support completely removed)
    const document = {
      shop: normalizedShop,
      email: email.trim().toLowerCase(), // Always save to email field
      subscriptionType: 'email', // Always email
      popupType: popupType || null,
      template: template || null,
      createdAt: new Date(),
    };

    // Insert the subscription
    const result = await collection.insertOne(document);

    console.log(`[Banner Subscriptions Repo] ✓ Saved email subscription for shop: ${normalizedShop}`, {
      subscriptionId: result.insertedId,
      popupType,
      template,
    });

    return {
      id: result.insertedId,
      ...document,
    };
  } catch (error) {
    console.error('[Banner Subscriptions Repo] Error saving subscription:', error);
    throw error;
  }
}

/**
 * Get all banner subscriptions for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of subscriptions to return (default: 100)
 * @param {number} options.skip - Number of subscriptions to skip (default: 0)
 * @returns {Promise<Array>} Array of subscription documents
 */
export async function getBannerSubscriptions(shop, options = {}) {
  try {
    const normalizedShop = normalizeShop(shop);
    const { limit = 100, skip = 0 } = options;
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const subscriptions = await collection
      .find({ shop: normalizedShop })
      .sort({ createdAt: -1 }) // Most recent first
      .limit(limit)
      .skip(skip)
      .toArray();

    console.log(`[Banner Subscriptions Repo] Retrieved ${subscriptions.length} subscriptions for shop: ${normalizedShop}`);

    return subscriptions;
  } catch (error) {
    console.error('[Banner Subscriptions Repo] Error getting subscriptions:', error);
    throw error;
  }
}

/**
 * Get subscription count for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @returns {Promise<number>} Total number of subscriptions
 */
export async function getBannerSubscriptionCount(shop) {
  try {
    const normalizedShop = normalizeShop(shop);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const count = await collection.countDocuments({ shop: normalizedShop });

    return count;
  } catch (error) {
    console.error('[Banner Subscriptions Repo] Error getting subscription count:', error);
    throw error;
  }
}

/**
 * Check if an email already exists for a shop
 * @param {string} shop - The shop domain
 * @param {string} email - Email address
 * @returns {Promise<boolean>} True if email already exists
 */
export async function contactExists(shop, email) {
  try {
    const normalizedShop = normalizeShop(shop);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    if (!email || typeof email !== 'string') {
      throw new Error('Email is required');
    }

    const query = {
      shop: normalizedShop,
      email: email.trim().toLowerCase(),
    };

    const existing = await collection.findOne(query);
    return !!existing;
  } catch (error) {
    console.error('[Banner Subscriptions Repo] Error checking if email exists:', error);
    throw error;
  }
}

