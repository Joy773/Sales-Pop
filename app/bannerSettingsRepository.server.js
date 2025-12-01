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
    'discountPercentage',
    'discountColor',
    'description',
    'descriptionColor',
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

  const layout3StyleFields = ['backgroundColor', 'borderColor', 'textColor', 'urlColor'];
  const layout1StyleFields = ['titleSize', 'descriptionSize', 'textColor', 'backgroundImageUrl'];

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

  // Filter styles object based on selected layout
  const filteredStyles = { ...settings.styles };
  
  if (selectedLayout === 'layout-1') {
    // For layout-1, preserve layout-1 style fields and remove layout-3 style fields
    layout3StyleFields.forEach((field) => {
      delete filteredStyles[field];
    });
    // Layout-1 style fields are already in filteredStyles, no need to delete them
    filteredSettings.styles = filteredStyles;
  } else if (selectedLayout === 'layout-3') {
    // For layout-3, keep layout-3 style fields and remove layout-1 style fields
    layout1StyleFields.forEach((field) => {
      delete filteredStyles[field];
    });
    filteredSettings.styles = filteredStyles;
  } else {
    // For other layouts, remove both layout-1 and layout-3 specific style fields
    layout3StyleFields.forEach((field) => {
      delete filteredStyles[field];
    });
    layout1StyleFields.forEach((field) => {
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

  // Load existing settings to preserve data from other layouts
  const existingDoc = await collection.findOne({ shop: normalizedShop });
  const existingSettings = existingDoc?.settings || {};

  // Smart merge: preserve layout-specific fields from existing settings
  const selectedLayout = settings.layouts?.selectedLayout || settings.selectedLayout || 'layout-1';
  
  // Preserve layout-specific style fields from existing settings
  const preservedStyles = { ...existingSettings.styles || {} };
  const layout1StyleFields = ['titleSize', 'descriptionSize', 'textColor', 'backgroundImageUrl'];
  const layout3StyleFields = ['backgroundColor', 'borderColor', 'textColor', 'urlColor'];
  
  // Preserve layout-1 style fields if not currently saving layout-1
  if (selectedLayout !== 'layout-1') {
    layout1StyleFields.forEach((field) => {
      if (existingSettings.styles?.[field] !== undefined) {
        preservedStyles[field] = existingSettings.styles[field];
      }
    });
  }
  
  // Preserve layout-3 style fields if not currently saving layout-3
  if (selectedLayout !== 'layout-3') {
    layout3StyleFields.forEach((field) => {
      if (existingSettings.styles?.[field] !== undefined) {
        preservedStyles[field] = existingSettings.styles[field];
      }
    });
  }
  
  // Preserve layout-specific layout fields from existing settings
  const preservedLayouts = { ...existingSettings.layouts || {} };
  const layout1Fields = ['discountPercentage', 'buttonText', 'buttonUrl', 'disclaimer', 'descriptionColor', 'discountColor', 'disclaimerColor', 'buttonColor'];
  const layout3Fields = ['borderSize', 'text', 'discountText', 'brandName', 'urlName', 'layout3ImageUrl', 'showBannerTo'];
  const layout4Fields = ['layout4PreviewImageUrl', 'layout4PageLink', 'layout4ShowBannerTo'];
  
  // Preserve layout-1 fields if not currently saving layout-1
  if (selectedLayout !== 'layout-1') {
    layout1Fields.forEach((field) => {
      if (existingSettings.layouts?.[field] !== undefined) {
        preservedLayouts[field] = existingSettings.layouts[field];
      }
    });
  }
  
  // Preserve layout-3 fields if not currently saving layout-3
  if (selectedLayout !== 'layout-3') {
    layout3Fields.forEach((field) => {
      if (existingSettings.layouts?.[field] !== undefined) {
        preservedLayouts[field] = existingSettings.layouts[field];
      }
    });
  }
  
  // Preserve layout-4 fields if not currently saving layout-4
  if (selectedLayout !== 'layout-4') {
    layout4Fields.forEach((field) => {
      if (existingSettings.layouts?.[field] !== undefined) {
        preservedLayouts[field] = existingSettings.layouts[field];
      }
    });
  }

  // Merge existing settings with filtered settings (filtered settings take precedence)
  const mergedSettings = {
    goal: { ...existingSettings.goal, ...filteredSettings.goal },
    countdown: { ...existingSettings.countdown, ...filteredSettings.countdown },
    styles: { ...preservedStyles, ...filteredSettings.styles },
    layouts: { ...preservedLayouts, ...filteredSettings.layouts },
  };

  const document = {
    shop: normalizedShop,
    settings: applyBannerSettingsDefaults(mergedSettings),
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

