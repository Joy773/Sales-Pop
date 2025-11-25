import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import {
  getLowStockSettings,
  saveLowStockSettings,
} from '../lowStockSettingsRepository.server';

/**
 * GET /api/low-stock/settings
 * Loads low stock settings when the page opens
 */
export async function loader({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    const settings = await getLowStockSettings(session.shop);
    return json({ success: true, settings: settings || {} });
  } catch (error) {
    console.error('[Low Stock Settings API] Loader error:', error);
    return json(
      {
        success: false,
        error: error.message || 'Failed to load low stock settings',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/low-stock/settings
 * Saves low stock settings when "Save" is clicked
 */
export async function action({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const contentType = request.headers.get('content-type') || '';
    let payload;

    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const formData = await request.formData();
      const settingsField = formData.get('settings');
      payload =
        typeof settingsField === 'string'
          ? JSON.parse(settingsField)
          : settingsField;
    }

    if (!payload || typeof payload !== 'object') {
      return json(
        {
          success: false,
          error: 'Invalid settings payload',
        },
        { status: 400 },
      );
    }

    const settings = payload.settings || payload;
    console.log(`[Low Stock Settings API] Saving settings for shop: ${shop}`, {
      settingsKeys: Object.keys(settings),
      settings: settings
    });
    
    const saved = await saveLowStockSettings(shop, settings);
    
    console.log(`[Low Stock Settings API] Settings saved successfully for shop: ${shop}`, {
      savedKeys: Object.keys(saved),
      saved: saved
    });

    return json({
      success: true,
      settings: saved,
      shop,
    });
  } catch (error) {
    console.error('[Low Stock Settings API] Action error:', error);
    return json(
      {
        success: false,
        error: error.message || 'Failed to save low stock settings',
      },
      { status: 500 },
    );
  }
}

