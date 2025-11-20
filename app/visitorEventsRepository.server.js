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

  const document = {
    shop: normalizedShop,
    timestamp,
    createdAt: now,
    eventId: eventPayload.eventId || null,
    browserId: eventPayload.browserId || null,
    sessionId: eventPayload.sessionId || null,
    pageUrl: eventPayload.pageUrl || null,
    referer: eventPayload.referer || null,
    title: eventPayload.title || null,
    locale: eventPayload.locale || null,
    userAgent: eventPayload.userAgent || null,
    source: eventPayload.source || null,
    rawPayload: eventPayload,
  };

  await collection.insertOne(document);
  return document;
}

export async function getVisitorCountSummary(shop, options = {}) {
  const normalizedShop = normalizeShop(shop);
  if (!normalizedShop) {
    throw new Error('Shop is required to look up visitor count summary');
  }

  const intervalMinutes = Number(options.intervalMinutes) || 30;
  const since = new Date(Date.now() - intervalMinutes * 60 * 1000);

  const client = await clientPromise;
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME);

  const matchClause = {
    shop: normalizedShop,
    timestamp: { $gte: since },
  };

  const totalEvents = await collection.countDocuments(matchClause);
  const uniqueVisitors = await collection.distinct('browserId', {
    ...matchClause,
    browserId: { $ne: null },
  });

  const latestEvent = await collection
    .find(matchClause)
    .sort({ timestamp: -1 })
    .limit(1)
    .toArray();

  return {
    count: uniqueVisitors.length || totalEvents || 0,
    uniqueVisitors: uniqueVisitors.length,
    totalEvents,
    intervalMinutes,
    intervalLabel: `last ${intervalMinutes} minutes`,
    lastEventAt: latestEvent[0]?.timestamp || null,
  };
}

export async function pruneVisitorEvents(shop, olderThanMinutes = 1440) {
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

  return result.deletedCount || 0;
}

