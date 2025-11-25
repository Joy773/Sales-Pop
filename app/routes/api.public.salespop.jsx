import { json } from '@remix-run/node';
import { getSalesPopStyles, getSalesPopEnabled } from '../stylesRepository.server';
import { getRandomOrder } from '../ordersRepository.server';
import { apiVersion } from '../shopify.server';
import prisma from '../db.server';

/**
 * Handle CORS preflight requests
 */
export async function options({ request }) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * GET /api/public/salespop?shop=myshop.myshopify.com
 * Public endpoint that combines styles and notification data for the storefront
 * - Styles: Fetched from MongoDB database
 * - Notification: Fetched directly from Shopify GraphQL API
 */
export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    let shop = url.searchParams.get('shop');

    if (!shop) {
      return json({ 
        error: 'Shop parameter is required',
        success: false 
      }, { status: 400 });
    }

    // Normalize shop domain to match how it's saved
    shop = shop.trim().toLowerCase();

    // Validate shop domain format
    if (!shop.includes('.myshopify.com')) {
      return json({ 
        error: 'Invalid shop domain',
        success: false 
      }, { status: 400 });
    }

    // Check if campaign is enabled
    const isEnabled = await getSalesPopEnabled(shop);
    if (!isEnabled) {
      return json({ 
        success: false,
        enabled: false,
        message: 'Campaign is disabled'
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
        }
      });
    }

    // Fetch styles from MongoDB database
    const styles = await getSalesPopStyles(shop);
    
    if (!styles) {
      console.error(`[Sales Pop API] ✗ No styles found in MongoDB for shop: "${shop}"`);
    }
    
    // Fetch notification data - fetch directly from GraphQL for real-time data
    // Skip MongoDB cache to always get fresh data
    let notification = null;
      
      try {
      // Load session from Prisma database using shop domain
      // Try both normalized and original shop format
      
      let sessionRecord = await prisma.session.findFirst({
        where: {
          shop: shop,
          isOnline: false
        }
      });
      
      // If not found, try with original case (before normalization)
      if (!sessionRecord) {
        const originalShop = url.searchParams.get('shop')?.trim();
        if (originalShop && originalShop !== shop) {
          sessionRecord = await prisma.session.findFirst({
            where: {
              shop: originalShop,
              isOnline: false
            }
          });
        }
      }
      
      // List all available sessions for debugging
      if (!sessionRecord) {
        const allSessions = await prisma.session.findMany({
          where: { isOnline: false },
          select: { shop: true, id: true }
        });
        console.error(`[Sales Pop API] No session found for "${shop}". Available sessions: ${allSessions.map(s => s.shop).join(', ')}`);
      }
      
      if (!sessionRecord || !sessionRecord.accessToken) {
        console.error(`[Sales Pop API] No session found for ${shop}, cannot query Shopify API`);
        throw new Error('No session found');
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
      
      // Get configuration to determine order type
      const orderType = styles?.selectedOrderType || 'realtime';
      const lookbackDays = parseInt(styles?.lookbackDays) || 30;
      
      // Build GraphQL query based on order type
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
      
      // Query Shopify GraphQL API directly using fetch with access token
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
        console.error(`[Sales Pop API] HTTP error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }
      
      const data = await response.json();
      if (data.errors) {
        console.error('[Sales Pop API] GraphQL errors:', data.errors);
        console.error('[Sales Pop API] Full error details:', JSON.stringify(data.errors, null, 2));
        throw new Error(`GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);
      }
      
      if (!data.data || !data.data.orders) {
        console.error('[Sales Pop API] Invalid GraphQL response:', JSON.stringify(data, null, 2));
        throw new Error('Invalid response from Shopify - no orders data');
      }
      
      const orders = data.data.orders.edges.map(edge => edge.node);
      
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
          
          // Build location string
          let location = '';
          const parts = [];
          if (shipping?.city) parts.push(shipping.city);
          if (shipping?.province) parts.push(shipping.province);
          if (shipping?.country) parts.push(shipping.country);
          location = parts.join(', ') || 'Unknown Location';
          
          // Get customer name
          const customerName = customer.displayName || 
                              `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 
                              'Someone';
          
          // Calculate time ago
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
        // Pick a random order from the fetched orders
        const randomIndex = Math.floor(Math.random() * validOrders.length);
        notification = validOrders[randomIndex];
      } else {
        console.error(`[Sales Pop API] ⚠️ No valid orders found after filtering (${orders.length} total orders fetched)`);
      }
      
      } catch (shopifyError) {
        console.error(`[Sales Pop API] ⚠️ Error fetching from Shopify GraphQL:`, shopifyError.message);
        console.error(`[Sales Pop API] Error stack:`, shopifyError.stack);
        
        // If it's a PCD error, provide helpful guidance
        if (shopifyError.message && shopifyError.message.includes('not approved to access the Order object')) {
          console.error(`[Sales Pop API] ⚠️ PCD (Protected Customer Data) access required. Enable PCD in Partner Dashboard, fetch orders via admin UI, or rely on order webhooks to populate data.`);
        }
      }
    
    // Fallback to mock data only if GraphQL completely failed
    if (!notification) {
      console.error(`[Sales Pop API] ⚠️ No real orders available, using fallback mock data`);
      notification = {
        customer: 'Sarah Johnson',
        location: 'New York, USA',
        product: 'Classic T-Shirt',
        productImage: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
        productUrl: '/products/classic-t-shirt',
        time: 'just now'
      };
    }

    // Ensure styles is always an object (never null or undefined)
    // Even if not found in DB, return empty object so frontend can merge with defaults
    const finalStyles = styles && typeof styles === 'object' ? styles : {};
    
    // Prepare response data
    const responseData = { 
      styles: finalStyles,
      notification: notification,
      success: true 
    };
    
    if (Object.keys(finalStyles).length === 0) {
      console.error(`[Sales Pop API] ⚠️ No styles found! Returning empty styles object. Frontend will use defaults. Save styles in the admin UI to resolve.`);
    }

    // Return combined data: styles from MongoDB + order from MongoDB (cached from Shopify)
    const response = json(responseData, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400',
      }
    });
    
    return response;
  } catch (error) {
    console.error('[Sales Pop API] Error loading salespop data:', error);
    return json({ 
      error: 'Failed to load data',
      success: false 
    }, { status: 500 });
  }
}

