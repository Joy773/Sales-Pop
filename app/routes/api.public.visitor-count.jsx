import { json } from '@remix-run/node';
import { getVisitorCountSettings } from '../visitorSettingsRepository.server';
import { getVisitorCountSummary } from '../visitorEventsRepository.server';

function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

export async function options() {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}

export async function loader({ request }) {
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

    const settings = await getVisitorCountSettings(shop);
    const intervalMinutes =
      Number(settings?.intervalMinutes) ||
      Number(settings?.lookbackMinutes) ||
      30;

    const visitor = await getVisitorCountSummary(shop, { intervalMinutes });

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

