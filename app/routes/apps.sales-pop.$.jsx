import { json } from '@remix-run/node';
import crypto from 'crypto';
import { getSalesPopStyles } from '../stylesRepository.server';
import { getCartCountdownSettings } from '../cartCountdownSettingsRepository.server';
import { apiVersion } from '../shopify.server';
import prisma from '../db.server';

/**
 * Verify App Proxy request signature from Shopify
 * Based on Shopify's App Proxy verification requirements
 */
function verifyAppProxySignature(queryParams, secretKey) {
  const { signature, ...params } = queryParams;
  
  if (!signature) {
    return false;
  }

  // Sort parameters alphabetically and create query string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  // Create HMAC
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(sortedParams);
  const calculatedSignature = hmac.digest('hex');

  // Compare signatures (timing-safe comparison)
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(calculatedSignature, 'hex')
  );
}

/**
 * App Proxy route handler
 * Handles requests to: https://store.myshopify.com/apps/sales-pop/*
 * 
 * Supported paths:
 * - /apps/sales-pop/orders - Fetch order notifications
 * - /apps/sales-pop/styles - Fetch styles configuration
 * - /apps/sales-pop/data - Fetch combined styles + orders (default)
 */
export async function loader({ request, params }) {
  try {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    
    // Extract required parameters
    const shop = queryParams.shop;
    const signature = queryParams.signature;
    const timestamp = queryParams.timestamp;
    // Validate required parameters
    if (!shop || !signature || !timestamp) {
      console.error('[App Proxy] Missing required parameters:', { shop: !!shop, signature: !!signature, timestamp: !!timestamp });
      return json({ 
        error: 'Missing required parameters',
        success: false 
      }, { status: 400 });
    }

    // Verify signature
    const secretKey = process.env.SHOPIFY_API_SECRET || '';
    if (!secretKey) {
      console.error('[App Proxy] SHOPIFY_API_SECRET not configured');
      return json({ 
        error: 'Server configuration error',
        success: false 
      }, { status: 500 });
    }

    const isValidSignature = verifyAppProxySignature(queryParams, secretKey);
    if (!isValidSignature) {
      console.error('[App Proxy] Invalid signature for shop:', shop);
      return json({ 
        error: 'Invalid signature',
        success: false 
      }, { status: 401 });
    }

    console.log(`[App Proxy] ✓ Verified request from ${shop}`);
    console.log(`[App Proxy] Shop parameter received: "${shop}" (type: ${typeof shop})`);
    
    // Normalize shop domain
    const normalizedShop = shop.trim().toLowerCase();
    console.log(`[App Proxy] Normalized shop domain: "${normalizedShop}"`);
    
    // Validate shop domain format
    if (!normalizedShop.includes('.myshopify.com')) {
      console.error(`[App Proxy] Invalid shop domain format: "${normalizedShop}"`);
      return json({ 
        error: 'Invalid shop domain',
        success: false 
      }, { status: 400 });
    }

    const rawPath = params['*'] || '';
    const pathSegments = rawPath.split('/').filter(Boolean);
    const pathRoot = pathSegments[0] || '';
    
    if (pathRoot === 'orders') {
      return await handleOrdersRequest(normalizedShop);
    } else if (pathRoot === 'styles') {
      return await handleStylesRequest(normalizedShop);
    } else if (pathRoot === 'cart-countdown') {
      return await handleCartCountdownRequest(normalizedShop);
    } else {
      // Default: return combined data (styles + orders)
      return await handleCombinedRequest(normalizedShop);
    }
  } catch (error) {
    console.error('[App Proxy] Error:', error);
    return json({ 
      error: 'Internal server error',
      success: false 
    }, { status: 500 });
  }
}

export async function action({ request, params }) {
  try {
    if (request.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, { status: 405 });
    }

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    const shop = queryParams.shop;
    const signature = queryParams.signature;
    const timestamp = queryParams.timestamp;

    if (!shop || !signature || !timestamp) {
      console.error('[App Proxy] (action) Missing required parameters:', { shop: !!shop, signature: !!signature, timestamp: !!timestamp });
      return json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const secretKey = process.env.SHOPIFY_API_SECRET || '';
    if (!secretKey) {
      console.error('[App Proxy] (action) SHOPIFY_API_SECRET not configured');
      return json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const isValidSignature = verifyAppProxySignature(queryParams, secretKey);
    if (!isValidSignature) {
      console.error('[App Proxy] (action) Invalid signature for shop:', shop);
      return json({ success: false, error: 'Invalid signature' }, { status: 401 });
    }

    const normalizedShop = shop.trim().toLowerCase();
    if (!normalizedShop.includes('.myshopify.com')) {
      console.error(`[App Proxy] (action) Invalid shop domain format: "${normalizedShop}"`);
      return json({ success: false, error: 'Invalid shop domain' }, { status: 400 });
    }

    return json({ success: false, error: 'Unsupported endpoint' }, { status: 404 });
  } catch (error) {
    console.error('[App Proxy] Action error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Fetch notification data (helper function)
 */
async function fetchNotificationData(shop) {
  console.log(`[App Proxy] fetchNotificationData called for shop: "${shop}"`);
  let notification = null;

  // Fetch directly from Shopify GraphQL API for real-time data (server-side, bypasses PCD)
  // Skip MongoDB cache to always get fresh data
  try {
    console.log(`[App Proxy] Attempting to fetch real-time orders from Shopify GraphQL...`);
    const sessionRecord = await prisma.session.findFirst({
      where: {
        shop: shop,
        isOnline: false
      }
    });

    if (!sessionRecord || !sessionRecord.accessToken) {
      console.warn(`[App Proxy] ⚠️ No session found for ${shop}`);
      console.warn(`[App Proxy] This means the app hasn't been installed/authorized yet`);
      throw new Error('No session found');
    }

    console.log(`[App Proxy] ✓ Session found for ${shop}, proceeding with GraphQL query`);

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

    // Get styles to determine order type
    const styles = await getSalesPopStyles(shop);
    const orderType = styles?.selectedOrderType || 'realtime';
    const lookbackDays = parseInt(styles?.lookbackDays) || 30;

    // Build GraphQL query
    let graphqlQuery;
    if (orderType === 'lookback') {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - lookbackDays);
      const isoDate = startDate.toISOString();
      
      graphqlQuery = `
        query getRecentOrders {
          orders(first: 10, query: "created_at:>${isoDate}", sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                name
                createdAt
                shippingAddress {
                  city
                  province
                  country
                }
                lineItems(first: 1) {
                  edges {
                    node {
                      title
                      variant {
                        image {
                          url
                          altText
                        }
                      }
                      product {
                        handle
                      }
                    }
                  }
                }
                customer {
                  displayName
                  firstName
                  lastName
                }
              }
            }
          }
        }
      `;
    } else {
      graphqlQuery = `
        query getRecentOrders {
          orders(first: 10, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                name
                createdAt
                shippingAddress {
                  city
                  province
                  country
                }
                lineItems(first: 1) {
                  edges {
                    node {
                      title
                      variant {
                        image {
                          url
                          altText
                        }
                      }
                      product {
                        handle
                      }
                    }
                  }
                }
                customer {
                  displayName
                  firstName
                  lastName
                }
              }
            }
          }
        }
      `;
    }

    // Query Shopify GraphQL API
    const shopifyApiUrl = `https://${session.shop}/admin/api/${apiVersion}/graphql.json`;
    const response = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken,
      },
      body: JSON.stringify({
        query: graphqlQuery
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[App Proxy] HTTP error ${response.status}:`, errorText);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('[App Proxy] GraphQL errors:', data.errors);
      throw new Error(`GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);
    }

    if (!data.data || !data.data.orders) {
      throw new Error('Invalid response from Shopify');
    }

    const orders = data.data.orders.edges.map(edge => edge.node);
    console.log(`[App Proxy] ✓ Fetched ${orders.length} orders from Shopify`);

    // Filter and transform orders
    const validOrders = orders
      .filter(order => {
        const hasLineItems = order.lineItems && order.lineItems.edges && order.lineItems.edges.length > 0;
        const hasCustomer = order.customer !== null && order.customer !== undefined;
        return hasLineItems && hasCustomer;
      })
      .map(order => {
        const lineItem = order.lineItems.edges[0].node;
        const customer = order.customer;
        const shipping = order.shippingAddress;
        
        const parts = [];
        if (shipping?.city) parts.push(shipping.city);
        if (shipping?.province) parts.push(shipping.province);
        if (shipping?.country) parts.push(shipping.country);
        const location = parts.join(', ') || 'Unknown Location';
        
        const customerName = customer.displayName || 
                            `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 
                            'Someone';
        
        const now = new Date();
        const orderDate = new Date(order.createdAt);
        const diffInSeconds = Math.floor((now - orderDate) / 1000);
        let time = 'just now';
        if (diffInSeconds >= 60 && diffInSeconds < 3600) {
          const minutes = Math.floor(diffInSeconds / 60);
          time = `${minutes} min${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds >= 3600 && diffInSeconds < 86400) {
          const hours = Math.floor(diffInSeconds / 3600);
          time = `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds >= 86400) {
          const days = Math.floor(diffInSeconds / 86400);
          time = `${days} day${days > 1 ? 's' : ''} ago`;
        }
        
        return {
          customer: customerName,
          location: location,
          product: lineItem.title,
          productImage: lineItem.variant?.image?.url || 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
          productUrl: lineItem.product?.handle ? `/products/${lineItem.product.handle}` : '#',
          time: time,
          createdAt: order.createdAt
        };
      });

    if (validOrders.length > 0) {
      const randomIndex = Math.floor(Math.random() * validOrders.length);
      notification = validOrders[randomIndex];
      console.log(`[App Proxy] ✓ Selected real order from GraphQL: ${notification.customer} bought ${notification.product} in ${notification.location}`);
      console.log(`[App Proxy] Order details:`, {
        customer: notification.customer,
        product: notification.product,
        location: notification.location,
        time: notification.time,
        productUrl: notification.productUrl,
        isRealData: true
      });
    } else {
      console.warn(`[App Proxy] ⚠️ No valid orders found after filtering (${orders.length} total orders fetched)`);
    }

  } catch (shopifyError) {
    console.error(`[App Proxy] Error fetching from Shopify GraphQL:`, shopifyError.message);
    console.error(`[App Proxy] Error stack:`, shopifyError.stack);
  }
  
  // Fallback to mock data only if GraphQL completely failed
  if (!notification) {
    console.warn(`[App Proxy] ⚠️ No real orders available, using fallback mock data`);
    notification = {
      customer: 'Sarah Johnson',
      location: 'New York, USA',
      product: 'Classic T-Shirt',
      productImage: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
      productUrl: '/products/classic-t-shirt',
      time: 'just now'
    };
    console.log(`[App Proxy] Using mock data (this means GraphQL fetch failed):`, notification);
  }

  console.log(`[App Proxy] Returning notification:`, {
    customer: notification.customer,
    product: notification.product,
    isMockData: notification.customer === 'Sarah Johnson' && notification.product === 'Classic T-Shirt'
  });

  return notification;
}

/**
 * Handle orders request
 */
async function handleOrdersRequest(shop) {
  console.log(`[App Proxy] Fetching orders for ${shop}`);
  const notification = await fetchNotificationData(shop);
  return json({ 
    notification: notification,
    success: true 
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    }
  });
}

/**
 * Handle styles request
 */
async function handleStylesRequest(shop) {
  console.log(`[App Proxy] Fetching styles for shop: "${shop}"`);
  const styles = await getSalesPopStyles(shop);
  
  if (styles) {
    console.log(`[App Proxy] ✓ Found styles for ${shop}:`, {
      propertyCount: Object.keys(styles).length,
      hasSelectedOrderType: 'selectedOrderType' in styles,
      hasBackgroundColor: 'backgroundColor' in styles,
      hasMessageTemplate: 'messageTemplate' in styles
    });
  } else {
    console.warn(`[App Proxy] ✗ No styles found in MongoDB for shop: "${shop}"`);
  }
  
  return json({ 
    styles: styles || {},
    success: true 
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    }
  });
}

/**
 * Handle cart countdown settings request
 */
async function handleCartCountdownRequest(shop) {
  console.log(`[App Proxy] Fetching cart countdown settings for shop: "${shop}"`);
  const settings = await getCartCountdownSettings(shop);
  if (settings) {
    console.log(`[App Proxy] ✓ Found cart countdown settings for ${shop}:`, {
      propertyCount: Object.keys(settings).length,
      keys: Object.keys(settings).slice(0, 10),
    });
  } else {
    console.warn(`[App Proxy] ✗ No cart countdown settings found for shop: "${shop}"`);
  }

  return json({
    success: true,
    settings: settings || {},
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    }
  });
}

/**
 * Handle combined request (styles + orders)
 */
async function handleCombinedRequest(shop) {
  console.log(`[App Proxy] Fetching combined data for shop: "${shop}"`);
  
  // Fetch styles
  console.log(`[App Proxy] Looking up styles for shop: "${shop}"`);
  const styles = await getSalesPopStyles(shop);
  
  if (styles) {
    console.log(`[App Proxy] ✓ Found styles for ${shop}:`, {
      propertyCount: Object.keys(styles).length,
      keys: Object.keys(styles).slice(0, 10),
      hasSelectedOrderType: 'selectedOrderType' in styles,
      hasLookbackDays: 'lookbackDays' in styles,
      hasBackgroundColor: 'backgroundColor' in styles,
      hasMessageTemplate: 'messageTemplate' in styles
    });
  } else {
    console.warn(`[App Proxy] ✗ No styles found in MongoDB for shop: "${shop}"`);
    console.warn(`[App Proxy] This could mean:`);
    console.warn(`[App Proxy]   1. Styles haven't been saved yet`);
    console.warn(`[App Proxy]   2. Shop domain mismatch (saved with different format)`);
    console.warn(`[App Proxy]   3. MongoDB connection issue`);
  }
  
  const finalStyles = styles && typeof styles === 'object' ? styles : {};
  
  // Fetch notification
  const notification = await fetchNotificationData(shop);
  
  console.log(`[App Proxy] Returning combined data:`, {
    hasStyles: Object.keys(finalStyles).length > 0,
    styleCount: Object.keys(finalStyles).length,
    hasNotification: !!notification,
    notificationCustomer: notification?.customer,
    notificationProduct: notification?.product,
    notificationLocation: notification?.location,
    isMockData: notification?.customer === 'Sarah Johnson' && notification?.product === 'Classic T-Shirt'
  });
  
  return json({ 
    styles: finalStyles,
    notification: notification,
    success: true 
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    }
  });
}

