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
    console.log(`[Styles Repo] Attempting to save styles for shop: "${shop}" (normalized: "${normalizedShop}")`);
    console.log(`[Styles Repo] Styles object has ${Object.keys(styles).length} keys`);
    
    // Ensure MongoDB connection is ready with timeout
    console.log(`[Styles Repo] Waiting for MongoDB connection...`);
    let client;
    try {
      client = await Promise.race([
        clientPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MongoDB connection timeout after 10 seconds')), 10000)
        )
      ]);
      console.log(`[Styles Repo] ✓ MongoDB client connected`);
    } catch (connError) {
      console.error(`[Styles Repo] ✗ MongoDB connection failed:`, connError);
      throw new Error(`Failed to connect to MongoDB: ${connError.message}`);
    }
    
    // Test connection by pinging the database
    try {
      await client.db('admin').admin().ping();
      console.log(`[Styles Repo] ✓ MongoDB ping successful`);
    } catch (pingError) {
      console.error(`[Styles Repo] ✗ MongoDB ping failed:`, pingError);
      throw new Error(`MongoDB connection is not healthy: ${pingError.message}`);
    }
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log(`[Styles Repo] Using database: ${DB_NAME}, collection: ${COLLECTION_NAME}`);
    
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
    
    console.log(`[Styles Repo] Attempting to save/update document for shop: "${normalizedShop}"`);
    console.log(`[Styles Repo] Styles object preview:`, {
      keys: Object.keys(styles).slice(0, 10),
      totalKeys: Object.keys(styles).length,
      sampleValues: {
        backgroundColor: styles.backgroundColor,
        textColor: styles.textColor,
        messageTemplate: styles.messageTemplate
      }
    });
    
    // Prepare document to save
    const documentToSave = {
      shop: normalizedShop,
      styles: styles,
      updatedAt: new Date()
    };
    
    console.log(`[Styles Repo] Document to save structure:`, {
      hasShop: !!documentToSave.shop,
      shopValue: documentToSave.shop,
      hasStyles: !!documentToSave.styles,
      stylesKeys: documentToSave.styles ? Object.keys(documentToSave.styles).length : 0,
      hasUpdatedAt: !!documentToSave.updatedAt
    });
    
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
      console.log(`[Styles Repo] ✓ replaceOne operation completed`);
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

    console.log(`[Styles Repo] Update result:`, {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      upsertedCount: updateResult.upsertedCount,
      upsertedId: updateResult.upsertedId ? updateResult.upsertedId.toString() : null,
      acknowledged: updateResult.acknowledged
    });

    // Verify the document was saved by reading it back
    let savedDoc;
    try {
      savedDoc = await collection.findOne({ shop: normalizedShop });
      console.log(`[Styles Repo] Verification query result:`, savedDoc ? 'Found' : 'Not found');
    } catch (findError) {
      console.error(`[Styles Repo] ✗ Verification query failed:`, findError);
      // Don't throw here - the save might have succeeded even if the read fails
    }
    
    if (!savedDoc) {
      // Try to find with different variations
      console.warn(`[Styles Repo] ⚠️ Document not found with exact match, trying variations...`);
      const variations = [
        shop, // Original shop (not normalized)
        shop.trim(), // Trimmed original
        shop.toLowerCase(), // Lowercase original
      ];
      
      for (const variation of variations) {
        if (variation === normalizedShop) continue; // Already tried
        const found = await collection.findOne({ shop: variation });
        if (found) {
          console.log(`[Styles Repo] ✓ Found document with variation: "${variation}"`);
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
          console.log(`[Styles Repo] Upsert created document with ID: ${updateResult.upsertedId}`);
          // Try to find by _id
          try {
            savedDoc = await collection.findOne({ _id: updateResult.upsertedId });
            if (savedDoc) {
              console.log(`[Styles Repo] ✓ Found document by _id`);
            }
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

    console.log(`[Styles Repo] ✓ Styles saved successfully for shop: "${normalizedShop}"`);
    console.log(`[Styles Repo] Saved document ID: ${savedDoc._id}`);
    console.log(`[Styles Repo] Saved shop domain in DB: "${savedDoc.shop}"`);
    console.log(`[Styles Repo] Saved styles count: ${savedDoc.styles ? Object.keys(savedDoc.styles).length : 0}`);
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
    console.log(`[Styles Repo] Fetching styles for shop: "${shop}" (normalized: "${normalizedShop}")`);
    
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Try to find with normalized shop match first
    let result = await collection.findOne({ shop: normalizedShop });
    
    if (result) {
      console.log(`[Styles Repo] ✓ Found styles document for shop: "${normalizedShop}"`);
      console.log(`[Styles Repo] Document has ${result.styles ? Object.keys(result.styles).length : 0} style properties`);
      
      if (result.styles && typeof result.styles === 'object') {
        // Log sample of what we're returning
        console.log(`[Styles Repo] Sample style values:`, {
          backgroundColor: result.styles.backgroundColor,
          textColor: result.styles.textColor,
          messageTemplate: result.styles.messageTemplate,
          selectedOrderType: result.styles.selectedOrderType,
          lookbackDays: result.styles.lookbackDays
        });
        return result.styles;
      } else {
        console.warn(`[Styles Repo] ⚠️ Styles document found but styles property is invalid:`, typeof result.styles);
        return null;
      }
    }
    
    // Fallback: try exact match (in case old data exists)
    result = await collection.findOne({ shop });
    if (result) {
      console.log(`[Styles Repo] ✓ Found styles with exact match (not normalized): "${shop}"`);
      console.log(`[Styles Repo] Consider normalizing shop domain in database`);
      return result.styles || null;
    }
    
    // If not found, try to find all documents to debug shop domain format
    console.log(`[Styles Repo] ✗ No styles found for shop: "${shop}" (normalized: "${normalizedShop}")`);
    const allDocs = await collection.find({}).limit(5).toArray();
    if (allDocs.length > 0) {
      console.log(`[Styles Repo] Available shop domains in database:`, allDocs.map(doc => `"${doc.shop}"`));
      console.log(`[Styles Repo] Looking for shop: "${normalizedShop}"`);
      console.log(`[Styles Repo] Shop domain match check:`, {
        exact: allDocs.some(doc => doc.shop === normalizedShop),
        original: allDocs.some(doc => doc.shop === shop)
      });
    } else {
      console.log(`[Styles Repo] No documents found in collection at all`);
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

