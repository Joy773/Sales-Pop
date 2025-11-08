import clientPromise from './db.mongo.server.js';

const DB_NAME = 'salespop';
const COLLECTION_NAME = 'salespop_orders';

/**
 * Save recent orders for a shop
 * @param {string} shop - The shop domain
 * @param {Array} orders - Array of order notification objects
 * @returns {Promise<Object>} The saved document
 */
export async function saveRecentOrders(shop, orders) {
  try {
    // Normalize shop domain for consistency
    const normalizedShop = shop.trim().toLowerCase();
    console.log(`[Orders Repo] Attempting to save ${orders.length} orders for shop: "${shop}" (normalized: "${normalizedShop}")`);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const ordersToSave = orders.slice(0, 50); // Keep only 50 most recent
    console.log(`[Orders Repo] Saving ${ordersToSave.length} orders (after limiting to 50) for ${shop}`);

    const result = await collection.findOneAndUpdate(
      { shop: normalizedShop },
      {
        $set: {
          shop: normalizedShop,
          orders: ordersToSave,
          updatedAt: new Date()
        }
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    );

    if (result && result.orders) {
      console.log(`[Orders Repo] ✓ Successfully saved ${result.orders.length} orders to MongoDB for ${shop}`);
    } else {
      console.error(`[Orders Repo] ✗ Save operation returned unexpected result for ${shop}:`, result);
      throw new Error('MongoDB save operation returned unexpected result');
    }

    return result;
  } catch (error) {
    console.error(`[Orders Repo] ✗ Error saving orders for ${shop}:`, error);
    console.error(`[Orders Repo] Error details:`, {
      name: error.name,
      message: error.message,
      code: error.code,
      codeName: error.codeName
    });
    throw error;
  }
}

/**
 * Get recent orders for a shop
 * @param {string} shop - The shop domain
 * @returns {Promise<Array|null>} Array of order notifications or null
 */
export async function getRecentOrders(shop) {
  // Normalize shop domain for consistency
  const normalizedShop = shop.trim().toLowerCase();
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  const result = await collection.findOne({ shop: normalizedShop });
  return result?.orders || null;
}

/**
 * Get a random order from recent orders
 * @param {string} shop - The shop domain
 * @returns {Promise<Object|null>} Random order notification or null
 */
export async function getRandomOrder(shop) {
  // Normalize shop domain for consistency
  const normalizedShop = shop.trim().toLowerCase();
  const orders = await getRecentOrders(normalizedShop);
  if (!orders || orders.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * orders.length);
  return orders[randomIndex];
}

/**
 * Clear old orders for a shop
 * @param {string} shop - The shop domain
 * @returns {Promise<boolean>} True if orders were deleted
 */
export async function clearOrders(shop) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  const result = await collection.deleteOne({ shop });
  return result.deletedCount > 0;
}

