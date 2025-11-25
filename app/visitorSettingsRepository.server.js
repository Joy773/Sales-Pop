import clientPromise from './db.mongo.server.js';

const DB_NAME = 'salespop';
const COLLECTION_NAME = 'visitor_count_settings';

/**
 * Save visitor count settings for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @param {Object} settings - The settings configuration object
 * @returns {Promise<Object>} The saved document
 */
export async function saveVisitorCountSettings(shop, settings) {
  try {
    // Normalize shop domain to ensure consistency
    const normalizedShop = shop.trim().toLowerCase();
    console.log(`[Visitor Settings Repo] Attempting to save settings for shop: "${shop}" (normalized: "${normalizedShop}")`);
    console.log(`[Visitor Settings Repo] Settings object has ${Object.keys(settings).length} keys`);
    
    // Ensure MongoDB connection is ready with timeout
    console.log(`[Visitor Settings Repo] Waiting for MongoDB connection...`);
    let client;
    try {
      client = await Promise.race([
        clientPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MongoDB connection timeout after 10 seconds')), 10000)
        )
      ]);
      console.log(`[Visitor Settings Repo] ✓ MongoDB client connected`);
    } catch (connError) {
      console.error(`[Visitor Settings Repo] ✗ MongoDB connection failed:`, connError);
      throw new Error(`Failed to connect to MongoDB: ${connError.message}`);
    }
    
    // Test connection by pinging the database
    try {
      await client.db('admin').admin().ping();
      console.log(`[Visitor Settings Repo] ✓ MongoDB ping successful`);
    } catch (pingError) {
      console.error(`[Visitor Settings Repo] ✗ MongoDB ping failed:`, pingError);
      throw new Error(`MongoDB connection is not healthy: ${pingError.message}`);
    }
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log(`[Visitor Settings Repo] Using database: ${DB_NAME}, collection: ${COLLECTION_NAME}`);
    
    // Validate settings object before saving
    if (typeof settings !== 'object' || settings === null) {
      throw new Error('Settings must be an object');
    }
    
    // Try to serialize to ensure it's valid
    try {
      JSON.stringify(settings);
    } catch (serializeError) {
      throw new Error(`Settings object cannot be serialized: ${serializeError.message}`);
    }
    
    console.log(`[Visitor Settings Repo] Attempting to save/update document for shop: "${normalizedShop}"`);
    
    // Use replaceOne with upsert for more reliable behavior
    const updateResult = await collection.replaceOne(
      { shop: normalizedShop },
      {
        shop: normalizedShop,
        settings,
        updatedAt: new Date()
      },
      {
        upsert: true
      }
    );

    console.log(`[Visitor Settings Repo] Update result:`, {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      upsertedCount: updateResult.upsertedCount,
      upsertedId: updateResult.upsertedId
    });

    // Verify the document was saved by reading it back
    const savedDoc = await collection.findOne({ shop: normalizedShop });
    
    if (!savedDoc) {
      console.error(`[Visitor Settings Repo] ✗ Save operation completed but document not found for ${normalizedShop}`);
      throw new Error('MongoDB save operation completed but document not found');
    }

    console.log(`[Visitor Settings Repo] ✓ Settings saved successfully for shop: "${normalizedShop}"`);
    console.log(`[Visitor Settings Repo] Saved document ID: ${savedDoc._id}`);
    return savedDoc;
  } catch (error) {
    console.error(`[Visitor Settings Repo] ✗ Error saving settings for ${shop}:`, error);
    console.error(`[Visitor Settings Repo] Error details:`, {
      name: error.name,
      message: error.message,
      code: error.code,
      codeName: error.codeName
    });
    throw error;
  }
}

/**
 * Get visitor count settings for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @returns {Promise<Object|null>} The settings configuration or null if not found
 */
export async function getVisitorCountSettings(shop) {
  try {
    // Normalize shop domain to match how it's saved
    const normalizedShop = shop.trim().toLowerCase();
    console.log(`[Visitor Settings Repo] Fetching settings for shop: "${shop}" (normalized: "${normalizedShop}")`);
    
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Try to find with normalized shop match first
    let result = await collection.findOne({ shop: normalizedShop });
    
    if (result) {
      console.log(`[Visitor Settings Repo] ✓ Found settings document for shop: "${normalizedShop}"`);
      console.log(`[Visitor Settings Repo] Document has ${result.settings ? Object.keys(result.settings).length : 0} setting properties`);
      
      if (result.settings && typeof result.settings === 'object') {
        return result.settings;
      } else {
        console.warn(`[Visitor Settings Repo] ⚠️ Settings document found but settings property is invalid:`, typeof result.settings);
        return null;
      }
    }
    
    // Fallback: try exact match (in case old data exists)
    result = await collection.findOne({ shop });
    if (result) {
      console.log(`[Visitor Settings Repo] ✓ Found settings with exact match (not normalized): "${shop}"`);
      return result.settings || null;
    }
    
    console.log(`[Visitor Settings Repo] ✗ No settings found for shop: "${shop}" (normalized: "${normalizedShop}")`);
    return null;
  } catch (error) {
    console.error(`[Visitor Settings Repo] Error fetching settings for ${shop}:`, error);
    throw error;
  }
}

export async function getVisitorCountEnabled(shop) {
  try {
    const normalizedShop = shop.trim().toLowerCase();
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const existing = await collection.findOne({ shop: normalizedShop });
    if (!existing) {
      return false;
    }

    return existing.enabled !== undefined ? existing.enabled : true; // Default to true if not set
  } catch (error) {
    console.error('[Visitor Settings Repo] Error getting enabled state:', error);
    return false;
  }
}

export async function setVisitorCountEnabled(shop, enabled) {
  try {
    const normalizedShop = shop.trim().toLowerCase();
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
    console.error('[Visitor Settings Repo] Error setting enabled state:', error);
    throw error;
  }
}

