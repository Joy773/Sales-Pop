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

/**
 * Filters banner settings to only include fields relevant to the selected layout
 * @param {Object} settings - The banner settings object
 * @returns {Object} - Filtered settings object with only relevant fields
 */
function filterSettingsByLayout(settings) {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const selectedLayout = settings.layouts?.selectedLayout || 'layout-1';

  // Define field categories
  const commonLayoutFields = ['selectedLayout', 'triggerTime', 'repeatAfter'];
  
  const layout1Fields = [
    'title1',
    'title1Color',
    'discountPercentage',
    'discountColor',
    'description',
    'descriptionColor',
    'titleSize',
    'buttonText',
    'buttonUrl',
    'buttonColor',
    'imageSource',
    'imageUrl',
    'disclaimer',
    'disclaimerColor',
  ];

  const layout3Fields = [
    'borderSize',
    'text',
    'discountText',
    'brandName',
    'urlName',
    'layout3ImageUrl',
    'showBannerTo',
  ];

  const layout4Fields = [
    'layout4PreviewImageUrl',
    'layout4PageLink',
    'layout4ShowBannerTo',
  ];

  const layout3StyleFields = ['borderColor', 'textColor', 'urlColor'];

  // Create filtered settings object
  const filteredSettings = {
    ...settings,
    layouts: { ...settings.layouts },
    styles: { ...settings.styles },
  };

  // Filter layouts object
  const filteredLayouts = {};

  // Always include common fields
  commonLayoutFields.forEach((field) => {
    if (settings.layouts && field in settings.layouts) {
      filteredLayouts[field] = settings.layouts[field];
    }
  });

  // Include layout-specific fields based on selectedLayout
  if (selectedLayout === 'layout-1') {
    layout1Fields.forEach((field) => {
      if (settings.layouts && field in settings.layouts) {
        filteredLayouts[field] = settings.layouts[field];
      }
    });
  } else if (selectedLayout === 'layout-3') {
    layout3Fields.forEach((field) => {
      if (settings.layouts && field in settings.layouts) {
        filteredLayouts[field] = settings.layouts[field];
      }
    });
  } else if (selectedLayout === 'layout-4') {
    layout4Fields.forEach((field) => {
      if (settings.layouts && field in settings.layouts) {
        filteredLayouts[field] = settings.layouts[field];
      }
    });
  }
  // For layout-2, only common fields are kept (no layout-specific fields)

  filteredSettings.layouts = filteredLayouts;

  // Filter styles object - only include layout-3 style fields if layout-3 is selected
  if (selectedLayout === 'layout-3') {
    // Keep layout-3 style fields if they exist
    const filteredStyles = { ...settings.styles };
    filteredSettings.styles = filteredStyles;
  } else {
    // Remove layout-3 style fields for non-layout-3 layouts
    const filteredStyles = { ...settings.styles };
    layout3StyleFields.forEach((field) => {
      delete filteredStyles[field];
    });
    filteredSettings.styles = filteredStyles;
  }

  return filteredSettings;
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

  // Filter settings to only include fields relevant to the selected layout
  const filteredSettings = filterSettingsByLayout(settings);

  const normalizedShop = normalizeShop(shop);
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  const document = {
    shop: normalizedShop,
    settings: applyBannerSettingsDefaults(filteredSettings),
    updatedAt: new Date(),
  };

  await collection.updateOne(
    { shop: normalizedShop },
    { $set: document },
    { upsert: true }
  );

  return document.settings;
}

export async function getBannerEnabled(shop) {
  try {
    const normalizedShop = normalizeShop(shop);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const existing = await collection.findOne({ shop: normalizedShop });
    if (!existing) {
      return false;
    }

    return existing.enabled !== undefined ? existing.enabled : true; // Default to true if not set
  } catch (error) {
    console.error('[Banner Settings Repo] Error getting enabled state:', error);
    return false;
  }
}

export async function setBannerEnabled(shop, enabled) {
  try {
    const normalizedShop = normalizeShop(shop);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    await collection.updateOne(
      { shop: normalizedShop },
      { $set: { enabled: enabled, updatedAt: new Date() } },
      { upsert: true }
    );

    return true;
  } catch (error) {
    console.error('[Banner Settings Repo] Error setting enabled state:', error);
    throw error;
  }
}

