/**
 * Shopify Client Utility Functions
 * Helper functions for working with Shopify GraphQL API, sessions, and authentication
 * These functions are server-only and should be used in API routes or loaders
 */

import { apiVersion } from '../shopify.server';
import prisma from '../db.server';

/**
 * Get Shopify session from database by shop domain
 * @param {string} shop - Shop domain (e.g., 'myshop.myshopify.com')
 * @param {boolean} isOnline - Whether to get online session (default: false)
 * @returns {Promise<Object|null>} Shopify session object or null if not found
 */
export async function getShopifySession(shop, isOnline = false) {
  try {
    if (!shop) {
      throw new Error('Shop parameter is required');
    }

    // Normalize shop domain
    const normalizedShop = shop.trim().toLowerCase();

    // Validate shop domain format
    if (!normalizedShop.includes('.myshopify.com')) {
      throw new Error('Invalid shop domain format');
    }

    // Try to find session with normalized shop
    let sessionRecord = await prisma.session.findFirst({
      where: {
        shop: normalizedShop,
        isOnline: isOnline
      }
    });

    // If not found, try with original case (before normalization)
    if (!sessionRecord) {
      const originalShop = shop.trim();
      if (originalShop !== normalizedShop) {
        sessionRecord = await prisma.session.findFirst({
          where: {
            shop: originalShop,
            isOnline: isOnline
          }
        });
      }
    }

    if (!sessionRecord || !sessionRecord.accessToken) {
      return null;
    }

    // Convert Prisma session to Shopify session format
    const session = {
      id: sessionRecord.id,
      shop: sessionRecord.shop,
      state: sessionRecord.state,
      isOnline: sessionRecord.isOnline,
      scope: sessionRecord.scope || '',
      expires: sessionRecord.expires,
      accessToken: sessionRecord.accessToken,
      userId: sessionRecord.userId?.toString(),
    };

    return session;
  } catch (error) {
    console.error('[Shopify Client] Error getting session:', error);
    throw error;
  }
}

/**
 * Execute a GraphQL query using direct fetch (when admin.graphql is not available)
 * @param {Object} session - Shopify session object with shop and accessToken
 * @param {string} query - GraphQL query string
 * @param {Object} variables - Optional GraphQL variables
 * @returns {Promise<Object>} GraphQL response data
 */
export async function executeGraphQLQuery(session, query, variables = {}) {
  try {
    if (!session || !session.shop || !session.accessToken) {
      throw new Error('Valid session with shop and accessToken is required');
    }

    if (!query) {
      throw new Error('GraphQL query is required');
    }

    const shopifyApiUrl = `https://${session.shop}/admin/api/${apiVersion}/graphql.json`;

    const response = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken,
      },
      body: JSON.stringify({
        query,
        variables: Object.keys(variables).length > 0 ? variables : undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Shopify Client] HTTP error ${response.status}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('[Shopify Client] GraphQL errors:', data.errors);
      throw new Error(`GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);
    }

    return data.data;
  } catch (error) {
    console.error('[Shopify Client] Error executing GraphQL query:', error);
    throw error;
  }
}

/**
 * Execute a GraphQL query using admin.graphql (preferred method when available)
 * @param {Object} admin - Shopify admin GraphQL client from authenticate
 * @param {string} query - GraphQL query string
 * @param {Object} variables - Optional GraphQL variables
 * @returns {Promise<Object>} GraphQL response data
 */
export async function executeAdminGraphQL(admin, query, variables = {}) {
  try {
    if (!admin || !admin.graphql) {
      throw new Error('Valid admin GraphQL client is required');
    }

    if (!query) {
      throw new Error('GraphQL query is required');
    }

    const response = await admin.graphql(query, {
      variables: Object.keys(variables).length > 0 ? variables : undefined
    });
    const data = await response.json();

    if (data.errors) {
      console.error('[Shopify Client] GraphQL errors:', data.errors);
      throw new Error(`GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);
    }

    if (!data.data) {
      console.error('[Shopify Client] Invalid GraphQL response:', data);
      throw new Error('Invalid response from Shopify');
    }

    return data.data;
  } catch (error) {
    console.error('[Shopify Client] Error executing admin GraphQL query:', error);
    throw error;
  }
}

/**
 * Get Shopify GraphQL API URL for a shop
 * @param {string} shop - Shop domain
 * @returns {string} GraphQL API URL
 */
export function getGraphQLApiUrl(shop) {
  if (!shop) {
    throw new Error('Shop parameter is required');
  }

  const normalizedShop = shop.trim().toLowerCase();
  return `https://${normalizedShop}/admin/api/${apiVersion}/graphql.json`;
}

/**
 * Create GraphQL request headers
 * @param {string} accessToken - Shopify access token
 * @returns {Object} Headers object for GraphQL requests
 */
export function createGraphQLHeaders(accessToken) {
  if (!accessToken) {
    throw new Error('Access token is required');
  }

  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': accessToken,
  };
}

/**
 * Validate shop domain format
 * @param {string} shop - Shop domain to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidShopDomain(shop) {
  if (!shop || typeof shop !== 'string') {
    return false;
  }

  const normalized = shop.trim().toLowerCase();
  return normalized.includes('.myshopify.com') && normalized.length > 14;
}

/**
 * Normalize shop domain (lowercase, trim)
 * @param {string} shop - Shop domain to normalize
 * @returns {string} Normalized shop domain
 */
export function normalizeShopDomain(shop) {
  if (!shop || typeof shop !== 'string') {
    throw new Error('Shop parameter must be a non-empty string');
  }

  return shop.trim().toLowerCase();
}

/**
 * Handle GraphQL errors and extract meaningful error messages
 * @param {Object} data - GraphQL response data
 * @returns {string|null} Error message or null if no errors
 */
export function extractGraphQLErrors(data) {
  if (!data || !data.errors || !Array.isArray(data.errors)) {
    return null;
  }

  return data.errors.map(error => {
    if (typeof error === 'string') {
      return error;
    }
    return error.message || JSON.stringify(error);
  }).join(', ');
}

/**
 * Check if GraphQL response has errors
 * @param {Object} data - GraphQL response data
 * @returns {boolean} True if errors exist, false otherwise
 */
export function hasGraphQLErrors(data) {
  return !!(data && data.errors && Array.isArray(data.errors) && data.errors.length > 0);
}

