import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import {
  saveVisitorCountSettings,
  getVisitorCountSettings,
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
    console.log(`[Visitor Settings API] POST /api/visitor-count/settings - Request received`);
    console.log(`[Visitor Settings API] Request method: ${request.method}`);
    console.log(`[Visitor Settings API] Request URL: ${request.url}`);
    console.log(`[Visitor Settings API] Request headers:`, Object.fromEntries(request.headers.entries()));

    let session;
    let shop;
    try {
      const authResult = await authenticate.admin(request);
      session = authResult.session;
      shop = session.shop;
      console.log(`[Visitor Settings API] ✓ Authenticated shop: "${shop}"`);
    } catch (authError) {
      console.error(`[Visitor Settings API] ✗ Authentication failed:`, authError);
      return json({
        error: 'Authentication failed',
        success: false,
        details: authError.message,
      }, { status: 401 });
    }

    const normalizedShop = shop.trim().toLowerCase();
    console.log(`[Visitor Settings API] Saving settings for shop: "${shop}" (normalized: "${normalizedShop}")`);

    let body;
    let settings;

    try {
      const contentType = request.headers.get('content-type') || '';
      console.log(`[Visitor Settings API] Content-Type:`, contentType);

      if (contentType.includes('application/json')) {
        body = await request.json();
        console.log(`[Visitor Settings API] Request body parsed as JSON`);
        settings = typeof body.settings !== 'undefined' ? body.settings : body;

        if (typeof settings === 'string') {
          console.log(`[Visitor Settings API] Settings provided as string, attempting JSON.parse`);
          settings = JSON.parse(settings);
          console.log(`[Visitor Settings API] ✓ Parsed stringified settings`);
        }
      } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        console.log(`[Visitor Settings API] FormData received, fields:`, Array.from(formData.keys()));
        const settingsStr = formData.get('settings');
        if (settingsStr) {
          settings = typeof settingsStr === 'string' ? JSON.parse(settingsStr) : settingsStr;
          console.log(`[Visitor Settings API] ✓ Parsed settings from form data`);
        }
      } else {
        body = await request.json();
        settings = body.settings || body;
      }
    } catch (parseError) {
      console.error(`[Visitor Settings API] ✗ Failed to parse request body:`, parseError);
      return json({
        error: 'Invalid request body',
        success: false,
        details: parseError.message,
      }, { status: 400 });
    }

    if (!settings) {
      console.warn(`[Visitor Settings API] No settings data provided for ${shop}`);
      return json({
        error: 'Settings data is required',
        success: false,
      }, { status: 400 });
    }

    if (typeof settings !== 'object' || Array.isArray(settings)) {
      console.error(`[Visitor Settings API] Settings is not a valid object:`, typeof settings, Array.isArray(settings));
      return json({
        error: 'Settings must be an object',
        success: false,
        details: `Received ${typeof settings} instead of object`,
      }, { status: 400 });
    }

    if (Object.keys(settings).length === 0) {
      console.warn(`[Visitor Settings API] Settings object is empty for ${shop}`);
      return json({
        error: 'Settings object is empty',
        success: false,
        details: 'Please configure settings before saving',
      }, { status: 400 });
    }

    console.log(`[Visitor Settings API] Settings object keys:`, Object.keys(settings));

    let serializedSettings;
    try {
      serializedSettings = JSON.stringify(settings);
      console.log(`[Visitor Settings API] Settings size:`, serializedSettings.length, 'bytes');
      JSON.parse(serializedSettings);
    } catch (jsonError) {
      console.error(`[Visitor Settings API] Settings object is not serializable:`, jsonError.message);
      return json({
        error: 'Invalid settings data: contains non-serializable values',
        success: false,
        details: jsonError.message,
      }, { status: 400 });
    }

    try {
      console.log(`[Visitor Settings API] Calling saveVisitorCountSettings for shop: "${normalizedShop}"...`);
      const result = await saveVisitorCountSettings(normalizedShop, settings);
      console.log(`[Visitor Settings API] ✓ Successfully saved settings for ${shop}`);
      console.log(`[Visitor Settings API] MongoDB result:`, result ? `Document saved (ID: ${result._id || 'N/A'})` : 'No result');

      return json({
        success: true,
        message: 'Settings saved successfully',
        documentId: result?._id?.toString() || null,
      });
    } catch (dbError) {
      console.error(`[Visitor Settings API] ✗ MongoDB error for ${shop}:`, dbError);
      console.error(`[Visitor Settings API] Error type: ${dbError.constructor.name}`);
      console.error(`[Visitor Settings API] MongoDB error details:`, {
        name: dbError.name,
        message: dbError.message,
        code: dbError.code,
        codeName: dbError.codeName,
        stack: dbError.stack?.substring(0, 500),
      });

      const errorMessage = dbError.message || 'Unknown database error';

      return json({
        error: errorMessage,
        success: false,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
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

