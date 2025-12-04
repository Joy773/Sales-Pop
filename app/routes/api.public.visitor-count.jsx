import { json } from '@remix-run/node';
import { getVisitorCountSettings, getVisitorCountEnabled } from '../visitorSettingsRepository.server';
import { getVisitorCountSummary } from '../visitorEventsRepository.server';

function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Type',
  };
}

export async function options() {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}

export async function loader({ request }) {
  // Handle OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(),
    });
  }

  try {
    const url = new URL(request.url);
    let shop = url.searchParams.get('shop');

    if (!shop) {
      return json(
        { success: false, error: 'Shop parameter is required' },
        { status: 400, headers: buildCorsHeaders() },
      );
    }

    shop = shop.trim().toLowerCase();

    if (!shop.includes('.myshopify.com')) {
      return json(
        { success: false, error: 'Invalid shop domain' },
        { status: 400, headers: buildCorsHeaders() },
      );
    }

    // Check if campaign is enabled
    const isEnabled = await getVisitorCountEnabled(shop);
    if (!isEnabled) {
      return json(
        {
          success: false,
          enabled: false,
          message: 'Campaign is disabled',
          settings: {},
          visitor: null,
        },
        { headers: buildCorsHeaders() },
      );
    }

    const settings = await getVisitorCountSettings(shop);
    const intervalMinutes =
      Number(settings?.intervalMinutes) ||
      Number(settings?.lookbackMinutes) ||
      30;

    console.log('[Visitor Count Public API] Fetching summary:', {
      shop,
      intervalMinutes,
      settingsKeys: Object.keys(settings || {}),
    });

    const visitor = await getVisitorCountSummary(shop, { intervalMinutes });

    console.log('[Visitor Count Public API] Summary result:', {
      shop,
      intervalMinutes,
      count: visitor.count,
      uniqueVisitors: visitor.uniqueVisitors,
      totalEvents: visitor.totalEvents,
      lastEventAt: visitor.lastEventAt?.toISOString() || 'none',
    });

    return json(
      {
        success: true,
        source: 'public_api',
        shop,
        settings: settings || {},
        visitor,
      },
      { headers: buildCorsHeaders() },
    );
  } catch (error) {
    console.error('[Visitor Count Public API] Error:', error);
    return json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: buildCorsHeaders() },
    );
  }
}

