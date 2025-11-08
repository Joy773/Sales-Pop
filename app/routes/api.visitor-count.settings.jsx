import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { 
  saveVisitorCountSettings, 
  getVisitorCountSettings
} from '../visitorSettingsRepository.server';

/**
 * GET /api/visitor-count/settings - Load visitor count settings for the current shop
 */
export async function loader({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    
    // Normalize shop domain to match how it's saved
    const normalizedShop = shop.trim().toLowerCase();
    console.log(`[Visitor Settings API] Loading settings for shop: "${shop}" (normalized: "${normalizedShop}")`);

    const settings = await getVisitorCountSettings(normalizedShop);
    
    if (settings) {
      console.log(`[Visitor Settings API] ✓ Loaded ${Object.keys(settings).length} setting properties for ${shop}`);
    } else {
      console.warn(`[Visitor Settings API] ✗ No settings found for ${shop}`);
    }
    
    return json({ settings: settings || {}, success: true });
  } catch (error) {
    console.error('[Visitor Settings API] Error loading settings:', error);
    return json({ 
      error: 'Failed to load settings',
      success: false 
    }, { status: 500 });
  }
}

/**
 * POST /api/visitor-count/settings - Save visitor count settings for the current shop
 */
export async function action({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    
    // Normalize shop domain to lowercase for consistency
    const normalizedShop = shop.trim().toLowerCase();
    console.log(`[Visitor Settings API] Saving settings for shop: "${shop}" (normalized: "${normalizedShop}")`);

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      console.warn(`[Visitor Settings API] No settings data provided for ${shop}`);
      return json({ 
        error: 'Settings data is required',
        success: false 
      }, { status: 400 });
    }

    console.log(`[Visitor Settings API] Settings object keys:`, Object.keys(settings));
    
    // Validate settings object can be serialized (no circular references, functions, etc.)
    let serializedSettings;
    try {
      serializedSettings = JSON.stringify(settings);
      console.log(`[Visitor Settings API] Settings size:`, serializedSettings.length, 'bytes');
      
      // Parse back to ensure it's valid JSON
      JSON.parse(serializedSettings);
    } catch (jsonError) {
      console.error(`[Visitor Settings API] Settings object is not serializable:`, jsonError.message);
      return json({ 
        error: 'Invalid settings data: contains non-serializable values (functions, circular references, etc.)',
        success: false,
        details: jsonError.message
      }, { status: 400 });
    }

    // Save to MongoDB
    try {
      console.log(`[Visitor Settings API] Calling saveVisitorCountSettings for shop: "${normalizedShop}"...`);
      const result = await saveVisitorCountSettings(normalizedShop, settings);
      console.log(`[Visitor Settings API] ✓ Successfully saved settings for ${shop}`);
      console.log(`[Visitor Settings API] MongoDB result:`, result ? `Document saved (ID: ${result._id || 'N/A'})` : 'No result');
      
      return json({ 
        success: true,
        message: 'Settings saved successfully'
      });
    } catch (dbError) {
      console.error(`[Visitor Settings API] ✗ MongoDB error for ${shop}:`, dbError);
      console.error(`[Visitor Settings API] Error type: ${dbError.constructor.name}`);
      console.error(`[Visitor Settings API] MongoDB error details:`, {
        name: dbError.name,
        message: dbError.message,
        code: dbError.code,
        codeName: dbError.codeName,
        stack: dbError.stack?.substring(0, 500)
      });
      
      // Return specific error messages
      const errorMessage = dbError.message || 'Unknown database error';
      
      return json({ 
        error: errorMessage,
        success: false,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Visitor Settings API] Error saving settings:', error);
    console.error('[Visitor Settings API] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    
    return json({ 
      error: error.message || 'Failed to save settings',
      success: false,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

