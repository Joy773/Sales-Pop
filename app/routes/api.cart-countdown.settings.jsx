import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import {
  getCartCountdownSettings,
  saveCartCountdownSettings,
} from '../cartCountdownSettingsRepository.server';

export async function loader({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    const settings = await getCartCountdownSettings(session.shop);
    console.log(
      "[Cart Countdown Settings API][loader] Returning settings for shop:",
      session.shop,
      "keys:",
      Object.keys(settings || {})
    );
    return json({ success: true, settings });
  } catch (error) {
    console.error('[Cart Countdown Settings API] Loader error:', error);
    return json(
      {
        success: false,
        error: error.message || 'Failed to load cart countdown settings',
      },
      { status: 500 },
    );
  }
}

export async function action({ request }) {
  try {
    console.log('[Cart Countdown Settings API][action] Request received:', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
    });

    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    console.log('[Cart Countdown Settings API][action] Authenticated shop:', shop);

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
      console.log(
        '[Cart Countdown Settings API][action] Parsed settings from form data fields:',
        Array.from(formData.keys())
      );
    }

    if (!payload || typeof payload !== 'object') {
      console.warn('[Cart Countdown Settings API][action] Invalid payload:', payload);
      return json(
        {
          success: false,
          error: 'Invalid settings payload',
        },
        { status: 400 },
      );
    }

    const settings = payload.settings || payload;
    console.log(
      '[Cart Countdown Settings API][action] Saving settings keys:',
      Object.keys(settings || {})
    );
    const saved = await saveCartCountdownSettings(shop, settings);
    console.log('[Cart Countdown Settings API][action] Save complete for shop:', shop);

    return json({
      success: true,
      settings: saved,
      shop,
    });
  } catch (error) {
    console.error('[Cart Countdown Settings API] Action error:', error);
    return json(
      {
        success: false,
        error: error.message || 'Failed to save cart countdown settings',
      },
      { status: 500 },
    );
  }
}

