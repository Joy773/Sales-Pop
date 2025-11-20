import clientPromise from './db.mongo.server.js';
import { applyBannerSettingsDefaults } from './utils/bannerSettingsDefaults.js';

const DB_NAME = 'salespop';
const COLLECTION_NAME = 'banner_pop_settings';

function normalizeShop(shop) {
  if (!shop || typeof shop !== 'string') {
    throw new Error('Shop domain is required to load or save banner settings');
  }
  return shop.trim().toLowerCase();
}

export async function getBannerSettings(shop) {
  const normalizedShop = normalizeShop(shop);
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  const existing = await collection.findOne({ shop: normalizedShop });
  if (!existing) {
    return applyBannerSettingsDefaults();
  }

  return applyBannerSettingsDefaults(existing.settings || {});
}

export async function saveBannerSettings(shop, settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('Settings must be a valid object');
  }

  const normalizedShop = normalizeShop(shop);
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  const document = {
    shop: normalizedShop,
    settings: applyBannerSettingsDefaults(settings),
    updatedAt: new Date(),
  };

  await collection.updateOne(
    { shop: normalizedShop },
    { $set: document },
    { upsert: true }
  );

  return document.settings;
}


