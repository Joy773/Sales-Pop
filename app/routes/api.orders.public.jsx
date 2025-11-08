import { json } from '@remix-run/node';
import { getRandomOrder } from '../ordersRepository.server';
import { apiVersion } from '../shopify.server';
import prisma from '../db.server';
import { getSalesPopStyles } from '../stylesRepository.server';

/**
 * GET /api/orders/public?shop=myshop.myshopify.com
 * Public endpoint to fetch sales pop notifications for storefront
 * Fetches orders directly from Shopify GraphQL API
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

    // Normalize shop domain
    shop = shop.trim().toLowerCase();

    // Validate shop domain format
    if (!shop.includes('.myshopify.com')) {
      return json({ 
        error: 'Invalid shop domain',
        success: false 
      }, { status: 400 });
    }

    console.log(`[Orders Public API] Fetching order for ${shop}`);
    let notification = null;

    // First, try MongoDB cache (doesn't require PCD approval)
    console.log(`[Orders Public API] Checking MongoDB cache first...`);
    notification = await getRandomOrder(shop);
    
    if (notification) {
      console.log(`[Orders Public API] ✓ Found order in MongoDB cache: ${notification.customer} bought ${notification.product}`);
      return json({ 
        notification: notification,
        success: true 
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    console.log(`[Orders Public API] No orders in MongoDB cache, attempting Shopify GraphQL API...`);
    console.warn(`[Orders Public API] Note: This requires Protected Customer Data (PCD) approval. If you see ACCESS_DENIED errors, use the admin UI to fetch orders first.`);

    try {
      // Load session from Prisma database
      let sessionRecord = await prisma.session.findFirst({
        where: {
          shop: shop,
          isOnline: false
        }
      });

      // Try original case if not found
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

      if (!sessionRecord || !sessionRecord.accessToken) {
        console.warn(`[Orders Public API] No session found for ${shop}`);
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

      // Query Shopify GraphQL API directly
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
        console.error(`[Orders Public API] HTTP error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        console.error('[Orders Public API] GraphQL errors:', data.errors);
        throw new Error(`GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);
      }

      if (!data.data || !data.data.orders) {
        console.error('[Orders Public API] Invalid GraphQL response');
        throw new Error('Invalid response from Shopify');
      }

      const orders = data.data.orders.edges.map(edge => edge.node);
      console.log(`[Orders Public API] ✓ Fetched ${orders.length} orders from Shopify`);

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
          const parts = [];
          if (shipping?.city) parts.push(shipping.city);
          if (shipping?.province) parts.push(shipping.province);
          if (shipping?.country) parts.push(shipping.country);
          const location = parts.join(', ') || 'Unknown Location';
          
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
        // Pick a random order
        const randomIndex = Math.floor(Math.random() * validOrders.length);
        notification = validOrders[randomIndex];
        console.log(`[Orders Public API] ✓ Selected order: ${notification.customer} bought ${notification.product}`);
      } else {
        console.warn(`[Orders Public API] No valid orders found`);
      }

    } catch (shopifyError) {
      console.error(`[Orders Public API] Error fetching from Shopify:`, shopifyError.message);
      
      // If it's a PCD error, provide helpful guidance
      if (shopifyError.message && shopifyError.message.includes('not approved to access the Order object')) {
        console.warn(`[Orders Public API] ⚠️ PCD (Protected Customer Data) access required.`);
        console.warn(`[Orders Public API] Solutions:`);
        console.warn(`[Orders Public API]   1. Enable PCD in Shopify Partner Dashboard (requires approval)`);
        console.warn(`[Orders Public API]   2. Use admin UI to fetch orders first (saves to MongoDB)`);
        console.warn(`[Orders Public API]   3. Webhook will auto-populate MongoDB when new orders are created`);
      }
    }
    
    // Fallback to mock data if both failed
    if (!notification) {
      const mockNotifications = [
        {
          customer: 'Sarah Johnson',
          location: 'New York, USA',
          product: 'Classic T-Shirt',
          productImage: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
          productUrl: '/products/classic-t-shirt',
          time: 'just now'
        },
        {
          customer: 'Marco Rossi',
          location: 'Milan, Italy',
          product: 'Premium Hoodie',
          productImage: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
          productUrl: '/products/premium-hoodie',
          time: '2 mins ago'
        },
        {
          customer: 'Emily Chen',
          location: 'Tokyo, Japan',
          product: 'Summer Dress',
          productImage: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
          productUrl: '/products/summer-dress',
          time: '5 mins ago'
        },
        {
          customer: 'David Brown',
          location: 'London, UK',
          product: 'Denim Jacket',
          productImage: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
          productUrl: '/products/denim-jacket',
          time: '10 mins ago'
        }
      ];
      
      notification = mockNotifications[Math.floor(Math.random() * mockNotifications.length)];
    }

    return json({ 
      notification: notification,
      success: true 
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('Error loading public orders:', error);
    return json({ 
      error: 'Failed to load notifications',
      success: false 
    }, { status: 500 });
  }
}

