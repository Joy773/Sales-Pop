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
    const saved = await saveCartCountdownSettings(shop, settings);

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

