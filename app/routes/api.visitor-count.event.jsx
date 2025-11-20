import { json } from '@remix-run/node';
import { recordVisitorEvent } from '../visitorEventsRepository.server';

function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export async function action({ request }) {
  if (request.method !== 'POST') {
    return json(
      { success: false, error: 'Method not allowed' },
      { status: 405, headers: buildCorsHeaders() },
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let payload;

    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const jsonPayload = formData.get('payload') || formData.get('data');
      payload = typeof jsonPayload === 'string' ? JSON.parse(jsonPayload) : Object.fromEntries(formData);
    } else {
      const text = await request.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    if (!payload || typeof payload !== 'object') {
      return json(
        { success: false, error: 'Invalid payload' },
        { status: 400, headers: buildCorsHeaders() },
      );
    }

    const shop = (payload.shop || '').trim().toLowerCase();
    if (!shop || !shop.includes('.myshopify.com')) {
      return json(
        { success: false, error: 'Valid shop domain is required' },
        { status: 400, headers: buildCorsHeaders() },
      );
    }

    await recordVisitorEvent(shop, payload);

    return json(
      { success: true },
      { headers: buildCorsHeaders() },
    );
  } catch (error) {
    console.error('[Visitor Count Event API] Error recording event:', error);
    return json(
      { success: false, error: error.message || 'Failed to record event' },
      { status: 500, headers: buildCorsHeaders() },
    );
  }
}

