import clientPromise from './db.mongo.server.js';

const DB_NAME = 'salespop';
const COLLECTION_NAME = 'salespop_styles';

/**
 * Save sales pop styles configuration for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @param {Object} styles - The styles configuration object
 * @returns {Promise<Object>} The saved document
 */
export async function saveSalesPopStyles(shop, styles) {
  try {
    // Normalize shop domain to ensure consistency
    const normalizedShop = shop.trim().toLowerCase();
    let client;
    try {
      client = await Promise.race([
        clientPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MongoDB connection timeout after 10 seconds')), 10000)
        )
      ]);
    } catch (connError) {
      console.error(`[Styles Repo] ✗ MongoDB connection failed:`, connError);
      throw new Error(`Failed to connect to MongoDB: ${connError.message}`);
    }
    
    // Test connection by pinging the database
    try {
      await client.db('admin').admin().ping();
    } catch (pingError) {
      console.error(`[Styles Repo] ✗ MongoDB ping failed:`, pingError);
      throw new Error(`MongoDB connection is not healthy: ${pingError.message}`);
    }
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Validate styles object before saving
    if (typeof styles !== 'object' || styles === null) {
      throw new Error('Styles must be an object');
    }
    
    // Try to serialize to ensure it's valid
    try {
      JSON.stringify(styles);
    } catch (serializeError) {
      throw new Error(`Styles object cannot be serialized: ${serializeError.message}`);
    }
    
    // Prepare document to save
    const documentToSave = {
      shop: normalizedShop,
      styles: styles,
      updatedAt: new Date()
    };
    
    // Use replaceOne with upsert for more reliable behavior
    // Save with normalized shop domain for consistency
    let updateResult;
    try {
      updateResult = await collection.replaceOne(
        { shop: normalizedShop },
        documentToSave,
        {
          upsert: true
        }
      );
    } catch (replaceError) {
      console.error(`[Styles Repo] ✗ replaceOne operation failed:`, replaceError);
      console.error(`[Styles Repo] Error details:`, {
        name: replaceError.name,
        message: replaceError.message,
        code: replaceError.code,
        codeName: replaceError.codeName
      });
      throw new Error(`Failed to save document: ${replaceError.message}`);
    }

    // Verify the document was saved by reading it back
    let savedDoc;
    try {
      savedDoc = await collection.findOne({ shop: normalizedShop });
    } catch (findError) {
      console.error(`[Styles Repo] ✗ Verification query failed:`, findError);
      // Don't throw here - the save might have succeeded even if the read fails
    }
    
    if (!savedDoc) {
      // Try to find with different variations
      console.error(`[Styles Repo] ⚠️ Document not found with exact match, trying variations...`);
      const variations = [
        shop, // Original shop (not normalized)
        shop.trim(), // Trimmed original
        shop.toLowerCase(), // Lowercase original
      ];
      
      for (const variation of variations) {
        if (variation === normalizedShop) continue; // Already tried
        const found = await collection.findOne({ shop: variation });
        if (found) {
          savedDoc = found;
          break;
        }
      }
      
      if (!savedDoc) {
        // List all documents in collection for debugging
        const allDocs = await collection.find({}).limit(5).toArray();
        console.error(`[Styles Repo] ✗ Document not found after save. Available shop domains:`, 
          allDocs.map(doc => `"${doc.shop}"`));
        console.error(`[Styles Repo] Looking for: "${normalizedShop}"`);
        
        // Check if upsert actually created a document
        if (updateResult.upsertedCount > 0 && updateResult.upsertedId) {
          // Try to find by _id
          try {
            savedDoc = await collection.findOne({ _id: updateResult.upsertedId });
          } catch (idError) {
            console.error(`[Styles Repo] ✗ Could not find by _id:`, idError);
          }
        }
        
        if (!savedDoc) {
          throw new Error(`MongoDB save operation completed but document not found. Upsert result: ${JSON.stringify({
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount,
            upsertedCount: updateResult.upsertedCount
          })}`);
        }
      }
    }

    return savedDoc;
  } catch (error) {
    console.error(`[Styles Repo] ✗ Error saving styles for ${shop}:`, error);
    console.error(`[Styles Repo] Error type: ${error.constructor.name}`);
    console.error(`[Styles Repo] Error details:`, {
      name: error.name,
      message: error.message,
      code: error.code,
      codeName: error.codeName,
      stack: error.stack?.substring(0, 300)
    });
    
    // Provide more user-friendly error messages
    if (error.message.includes('timeout')) {
      throw new Error('Database connection timed out. Please check your internet connection and MongoDB server status.');
    } else if (error.message.includes('authentication')) {
      throw new Error('Database authentication failed. Please check your MongoDB connection string.');
    } else if (error.message.includes('not authorized')) {
      throw new Error('Database access denied. Please check your MongoDB user permissions.');
    } else if (error.message.includes('connection')) {
      throw new Error('Cannot connect to database. Please check your MongoDB connection string and network connection.');
    }
    
    throw error; // Re-throw to let the API route handle it
  }
}

/**
 * Get sales pop styles configuration for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @returns {Promise<Object|null>} The styles configuration or null if not found
 */
export async function getSalesPopStyles(shop) {
  try {
    // Normalize shop domain to match how it's saved
    const normalizedShop = shop.trim().toLowerCase();
    
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Try to find with normalized shop match first
    let result = await collection.findOne({ shop: normalizedShop });
    
    if (result) {
      if (result.styles && typeof result.styles === 'object') {
        return result.styles;
      } else {
        console.error(`[Styles Repo] ⚠️ Styles document found but styles property is invalid:`, typeof result.styles);
        return null;
      }
    }
    
    // Fallback: try exact match (in case old data exists)
    result = await collection.findOne({ shop });
    if (result) {
      return result.styles || null;
    }
    
    // If not found, try to find all documents to debug shop domain format
    console.error(`[Styles Repo] ✗ No styles found for shop: "${shop}" (normalized: "${normalizedShop}")`);
    const allDocs = await collection.find({}).limit(5).toArray();
    if (allDocs.length > 0) {
      console.error(`[Styles Repo] Available shop domains in database:`, allDocs.map(doc => `"${doc.shop}"`));
      console.error(`[Styles Repo] Looking for shop: "${normalizedShop}"`);
      console.error(`[Styles Repo] Shop domain match check:`, {
        exact: allDocs.some(doc => doc.shop === normalizedShop),
        original: allDocs.some(doc => doc.shop === shop)
      });
    } else {
      console.error(`[Styles Repo] No documents found in collection at all`);
    }
    
    return null;
  } catch (error) {
    console.error(`[Styles Repo] Error fetching styles for ${shop}:`, error);
    throw error;
  }
}

/**
 * Delete sales pop styles configuration for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @returns {Promise<boolean>} True if a document was deleted, false otherwise
 */
export async function deleteSalesPopStyles(shop) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  const result = await collection.deleteOne({ shop });
  return result.deletedCount > 0;
}

/**
 * Check if styles exist for a shop
 * @param {string} shop - The shop domain (e.g., 'mystore.myshopify.com')
 * @returns {Promise<boolean>} True if styles exist, false otherwise
 */
export async function hasSalesPopStyles(shop) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  const count = await collection.countDocuments({ shop });
  return count > 0;
}

export async function getSalesPopEnabled(shop) {
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
    console.error('[Styles Repo] Error getting enabled state:', error);
    return false;
  }
}

export async function setSalesPopEnabled(shop, enabled) {
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
    console.error('[Styles Repo] Error setting enabled state:', error);
    throw error;
  }
}

