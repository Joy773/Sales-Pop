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

    const settings = await getVisitorCountSettings(normalizedShop);
    
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
    let session;
    let shop;
    try {
      const authResult = await authenticate.admin(request);
      session = authResult.session;
      shop = session.shop;
    } catch (authError) {
      console.error(`[Visitor Settings API] Authentication failed:`, authError);
      return json({
        error: 'Authentication failed',
        success: false,
        details: authError.message,
      }, { status: 401 });
    }

    const normalizedShop = shop.trim().toLowerCase();

    let body;
    let settings;

    try {
      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        body = await request.json();
        settings = typeof body.settings !== 'undefined' ? body.settings : body;

        if (typeof settings === 'string') {
          settings = JSON.parse(settings);
        }
      } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        const settingsStr = formData.get('settings');
        if (settingsStr) {
          settings = typeof settingsStr === 'string' ? JSON.parse(settingsStr) : settingsStr;
        }
      } else {
        body = await request.json();
        settings = body.settings || body;
      }
    } catch (parseError) {
      console.error(`[Visitor Settings API] Failed to parse request body:`, parseError);
      return json({
        error: 'Invalid request body',
        success: false,
        details: parseError.message,
      }, { status: 400 });
    }

    if (!settings) {
      return json({
        error: 'Settings data is required',
        success: false,
      }, { status: 400 });
    }

    if (typeof settings !== 'object' || Array.isArray(settings)) {
      return json({
        error: 'Settings must be an object',
        success: false,
        details: `Received ${typeof settings} instead of object`,
      }, { status: 400 });
    }

    if (Object.keys(settings).length === 0) {
      return json({
        error: 'Settings object is empty',
        success: false,
        details: 'Please configure settings before saving',
      }, { status: 400 });
    }

    let serializedSettings;
    try {
      serializedSettings = JSON.stringify(settings);
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
      const result = await saveVisitorCountSettings(normalizedShop, settings);

      return json({
        success: true,
        message: 'Settings saved successfully',
        documentId: result?._id?.toString() || null,
      });
    } catch (dbError) {
      console.error(`[Visitor Settings API] MongoDB error for ${shop}:`, dbError);

      const errorMessage = dbError.message || 'Unknown database error';

      return json({
        error: errorMessage,
        success: false,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Visitor Settings API] Error saving settings:', error);
    
    return json({ 
      error: error.message || 'Failed to save settings',
      success: false,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

