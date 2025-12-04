import clientPromise from './db.mongo.server.js';

const DB_NAME = 'salespop';
const COLLECTION_NAME = 'visitor_count_events';

function normalizeShop(shop) {
  return shop?.trim().toLowerCase();
}

function coerceDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

export async function recordVisitorEvent(shop, eventPayload = {}) {
  const normalizedShop = normalizeShop(shop);
  if (!normalizedShop) {
    throw new Error('Shop is required to record visitor event');
  }

  const client = await clientPromise;
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME);

  const now = new Date();
  const timestamp = coerceDate(eventPayload.timestamp || now);
  const browserId = eventPayload.browserId || null;

  // Check if browserID already exists in the last 30 minutes for this shop
  // This ensures we only record once per browserID per 30-minute window
  if (browserId) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existingEvent = await collection.findOne({
      shop: normalizedShop,
      browserId: browserId,
      timestamp: { $gte: thirtyMinutesAgo },
    });

    if (existingEvent) {
      console.log('[Visitor Events Repo] ⏭️ Skipping insert - browserID already exists in last 30 minutes:', {
        shop: normalizedShop,
        browserId: browserId,
        existingEventTimestamp: existingEvent.timestamp.toISOString(),
        timeSinceExistingEvent: Math.round((now - existingEvent.timestamp) / 1000 / 60) + ' minutes',
      });
      // Return the existing event instead of creating a new one
      return { ...existingEvent, skipped: true };
    }
  }

  const document = {
    shop: normalizedShop,
    timestamp,
    createdAt: now,
    eventId: eventPayload.eventId || null,
    browserId: browserId,
    sessionId: eventPayload.sessionId || null,
    pageUrl: eventPayload.pageUrl || null,
    referer: eventPayload.referer || null,
    title: eventPayload.title || null,
    locale: eventPayload.locale || null,
    userAgent: eventPayload.userAgent || null,
    source: eventPayload.source || null,
    rawPayload: eventPayload,
  };

  console.log('[Visitor Events Repo] Inserting event document:', {
    shop: normalizedShop,
    browserId: document.browserId,
    sessionId: document.sessionId,
    timestamp: document.timestamp.toISOString(),
    eventId: document.eventId,
  });

  const result = await collection.insertOne(document);
  
  console.log('[Visitor Events Repo] ✓ Event inserted:', {
    shop: normalizedShop,
    insertedId: result.insertedId,
    browserId: document.browserId,
    sessionId: document.sessionId,
  });

  // Run cleanup automatically after recording event
  // Use a simple probability check to avoid running cleanup on every event
  // This ensures cleanup happens regularly without impacting performance
  // Cleanup runs approximately every 10th event (10% chance)
  if (Math.random() < 0.1) {
    // Run cleanup asynchronously (don't wait for it)
    pruneVisitorEvents(normalizedShop, 30).catch((error) => {
      console.warn('[Visitor Events Repo] Cleanup failed (non-critical):', error.message);
    });
  }

  return { ...document, _id: result.insertedId };
}

export async function getVisitorCountSummary(shop, options = {}) {
  const normalizedShop = normalizeShop(shop);
  if (!normalizedShop) {
    throw new Error('Shop is required to look up visitor count summary');
  }

  const intervalMinutes = Number(options.intervalMinutes) || 30;
  const since = new Date(Date.now() - intervalMinutes * 60 * 1000);

  console.log('[Visitor Events Repo] Calculating summary:', {
    shop: normalizedShop,
    intervalMinutes,
    since: since.toISOString(),
    now: new Date().toISOString(),
  });

  const client = await clientPromise;
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME);

  const matchClause = {
    shop: normalizedShop,
    timestamp: { $gte: since },
  };

  const totalEvents = await collection.countDocuments(matchClause);
  
  // Get unique browser IDs (excluding null/undefined)
  const uniqueVisitors = await collection.distinct('browserId', {
    ...matchClause,
    browserId: { $ne: null, $exists: true },
  });

  // Count events without browserId (fallback for events that don't have browserId set)
  const eventsWithoutBrowserId = await collection.countDocuments({
    ...matchClause,
    $or: [
      { browserId: null },
      { browserId: { $exists: false } },
    ],
  });

  const latestEvent = await collection
    .find(matchClause)
    .sort({ timestamp: -1 })
    .limit(1)
    .toArray();

  // Calculate count: prefer unique visitors, but if none exist, use total events
  // This ensures we show at least 1 if there are any events
  const uniqueCount = uniqueVisitors.length;
  const finalCount = uniqueCount > 0 ? uniqueCount : (totalEvents > 0 ? totalEvents : 0);

  const summary = {
    count: finalCount,
    uniqueVisitors: uniqueCount,
    totalEvents,
    eventsWithoutBrowserId,
    intervalMinutes,
    intervalLabel: `last ${intervalMinutes} minutes`,
    lastEventAt: latestEvent[0]?.timestamp || null,
  };

  console.log('[Visitor Events Repo] Summary calculated:', {
    shop: normalizedShop,
    intervalMinutes,
    totalEvents,
    uniqueVisitors: uniqueCount,
    eventsWithoutBrowserId: summary.eventsWithoutBrowserId,
    uniqueBrowserIds: uniqueVisitors.slice(0, 10), // Show first 10 for debugging
    finalCount: summary.count,
    calculation: uniqueCount > 0 ? `uniqueVisitors (${uniqueCount})` : `totalEvents (${totalEvents})`,
    lastEventAt: summary.lastEventAt?.toISOString() || 'none',
  });

  // Run cleanup occasionally when fetching summary (1% chance)
  // This ensures cleanup happens even if event recording is slow
  if (Math.random() < 0.01) {
    pruneVisitorEvents(normalizedShop, 30).catch((error) => {
      console.warn('[Visitor Events Repo] Cleanup failed during summary fetch (non-critical):', error.message);
    });
  }

  return summary;
}

export async function pruneVisitorEvents(shop, olderThanMinutes = 30) {
  const normalizedShop = normalizeShop(shop);
  if (!normalizedShop) {
    throw new Error('Shop is required to prune visitor events');
  }

  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  const client = await clientPromise;
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME);

  const result = await collection.deleteMany({
    shop: normalizedShop,
    timestamp: { $lt: cutoff },
  });

  if (result.deletedCount > 0) {
    console.log('[Visitor Events Repo] ✓ Cleaned up old events:', {
      shop: normalizedShop,
      deletedCount: result.deletedCount,
      olderThanMinutes,
      cutoff: cutoff.toISOString(),
    });
  }

  return result.deletedCount || 0;
}

