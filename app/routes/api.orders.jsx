import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { getSalesPopStyles } from '../stylesRepository.server';
import { saveRecentOrders } from '../ordersRepository.server';

/**
 * GET /api/orders - Fetch orders for sales pop notifications
 */
export async function loader({ request }) {
  try {
    const { session, admin } = await authenticate.public.appProxy(request);
    const shop = session.shop;
    const normalizedShop = shop.trim().toLowerCase();

    // Get configuration to determine order type (realtime vs lookback)
    const styles = await getSalesPopStyles(normalizedShop);
    const orderType = styles?.selectedOrderType || 'realtime';
    const lookbackDays = parseInt(styles?.lookbackDays) || 30;

    // Build GraphQL query based on order type
    let graphqlQuery;
    if (orderType === 'lookback') {
      // Query orders from the last N days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - lookbackDays);
      
      // Use proper ISO 8601 format with timezone
      const isoDate = startDate.toISOString();
      
      graphqlQuery = `
        query getRecentOrders {
          orders(first: 50, query: "created_at:>${isoDate}", sortKey: CREATED_AT, reverse: true) {
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
      // Query most recent orders (realtime)
      graphqlQuery = `
        query getRecentOrders {
          orders(first: 50, sortKey: CREATED_AT, reverse: true) {
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

    console.log(`[Orders API] Fetching orders for ${shop} - Order Type: ${orderType}, Lookback Days: ${lookbackDays}`);
    
    const response = await admin.graphql(graphqlQuery);
    const data = await response.json();

    if (data.errors) {
      console.error('[Orders API] GraphQL errors:', data.errors);
      return json({
        error: 'Failed to fetch orders',
        success: false,
        details: data.errors.map(e => e.message).join(', ')
      }, { status: 500 });
    }

    if (!data.data || !data.data.orders) {
      console.error('[Orders API] Invalid GraphQL response:', data);
      return json({
        error: 'Invalid response from Shopify',
        success: false
      }, { status: 500 });
    }

    const orders = data.data.orders.edges.map(edge => edge.node);
    console.log(`[Orders API] Fetched ${orders.length} raw orders from Shopify for ${shop}`);

    // Log why orders are being filtered out
    const ordersWithoutLineItems = orders.filter(order => !order.lineItems || !order.lineItems.edges || order.lineItems.edges.length === 0);
    const ordersWithoutCustomers = orders.filter(order => !order.customer);
    if (ordersWithoutLineItems.length > 0) {
      console.log(`[Orders API] ${ordersWithoutLineItems.length} orders filtered out - no line items`);
    }
    if (ordersWithoutCustomers.length > 0) {
      console.log(`[Orders API] ${ordersWithoutCustomers.length} orders filtered out - no customer`);
    }

    // Transform orders for notifications
    const notifications = orders
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
        
        return {
          customer: customerName,
          location: location,
          product: lineItem.title,
          productImage: lineItem.variant?.image?.url || 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
          productUrl: lineItem.product?.handle ? `/products/${lineItem.product.handle}` : '#',
          time: calculateTimeAgo(order.createdAt),
          createdAt: order.createdAt
        };
      });

    console.log(`[Orders API] Transformed ${notifications.length} valid notifications from ${orders.length} raw orders for ${shop}`);

    // Save orders to MongoDB for quick retrieval by storefront
    if (notifications.length > 0) {
      try {
        await saveRecentOrders(normalizedShop, notifications);
        console.log(`[Orders API] ✓ Successfully saved ${notifications.length} orders to MongoDB for ${shop}`);
        
        // Verify the save worked by checking MongoDB
        const { getRecentOrders } = await import('../ordersRepository.server');
        const savedOrders = await getRecentOrders(normalizedShop);
        if (savedOrders && savedOrders.length > 0) {
          console.log(`[Orders API] ✓ Verified: ${savedOrders.length} orders now in MongoDB for ${shop}`);
        } else {
          console.error(`[Orders API] ✗ WARNING: Save reported success but no orders found in MongoDB for ${shop}`);
        }
      } catch (saveError) {
        console.error(`[Orders API] ✗ Error saving orders to MongoDB for ${shop}:`, saveError);
        return json({
          error: 'Failed to save orders to database',
          success: false,
          details: saveError.message,
          notifications,
          count: notifications.length
        }, { status: 500 });
      }
    } else {
      console.log(`[Orders API] No notifications to save for ${shop}`);
      console.log(`[Orders API] Reasons: ${orders.length} total orders, ${ordersWithoutLineItems.length} without line items, ${ordersWithoutCustomers.length} without customers`);
    }

    return json({
      notifications,
      success: true,
      count: notifications.length,
      totalOrdersFetched: orders.length,
      message: notifications.length > 0 
        ? `Successfully fetched and saved ${notifications.length} orders`
        : `No valid orders found. Fetched ${orders.length} orders but none have both line items and customers.`
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return json({
      error: 'Failed to fetch orders',
      success: false
    }, { status: 500 });
  }
}

/**
 * Calculate time ago string
 */
function calculateTimeAgo(dateString) {
  const now = new Date();
  const orderDate = new Date(dateString);
  const diffInSeconds = Math.floor((now - orderDate) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

