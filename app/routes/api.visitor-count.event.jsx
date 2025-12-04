import { json } from '@remix-run/node';
import { recordVisitorEvent } from '../visitorEventsRepository.server';

function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Type',
  };
}

export async function options({ request }) {
  console.log('[Visitor Count Event API] OPTIONS preflight request received');
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}

export async function loader({ request }) {
  // Handle OPTIONS preflight requests in loader as well
  if (request.method === 'OPTIONS') {
    console.log('[Visitor Count Event API] OPTIONS handled in loader');
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(),
    });
  }
  // For GET requests, return method not allowed
  return json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405, headers: buildCorsHeaders() },
  );
}

export async function action({ request }) {
  try {
    // Handle OPTIONS preflight requests FIRST, before any body parsing
    if (request.method === 'OPTIONS') {
      console.log('[Visitor Count Event API] OPTIONS handled in action');
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(),
      });
    }

    if (request.method !== 'POST') {
      return json(
        { success: false, error: 'Method not allowed' },
        { status: 405, headers: buildCorsHeaders() },
      );
    }

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

    console.log('[Visitor Count Event API] Recording event:', {
      shop,
      browserId: payload.browserId || 'missing',
      sessionId: payload.sessionId || 'missing',
      timestamp: payload.timestamp || 'missing',
      eventId: payload.eventId || 'missing',
      userAgent: payload.userAgent ? payload.userAgent.substring(0, 50) + '...' : 'missing',
      pageUrl: payload.pageUrl || 'missing',
    });

    const result = await recordVisitorEvent(shop, payload);

    if (result.skipped) {
      console.log('[Visitor Count Event API] ⏭️ Event skipped - browserID already recorded in last 30 minutes:', {
        shop,
        browserId: result.browserId,
        existingEventTimestamp: result.timestamp,
        mongoId: result._id,
      });
    } else {
      console.log('[Visitor Count Event API] ✓ Event recorded successfully:', {
        shop,
        browserId: result.browserId,
        sessionId: result.sessionId,
        timestamp: result.timestamp,
        eventId: result.eventId,
        mongoId: result._id,
      });
    }

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

