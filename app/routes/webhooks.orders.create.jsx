import { authenticate } from "../shopify.server";
import { getRecentOrders, saveRecentOrders } from "../ordersRepository.server";

export const action = async ({ request }) => {
  const { shop, topic, payload, admin } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    // Get current orders from MongoDB
    let currentOrders = await getRecentOrders(shop) || [];
    
    // Fetch full order details using GraphQL
    const orderId = payload.admin_graphql_api_id || payload.id;
    
    if (orderId && admin) {
      const graphqlQuery = `
        query getOrder($id: ID!) {
          order(id: $id) {
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
      `;

      const response = await admin.graphql(graphqlQuery, {
        variables: { id: orderId }
      });
      const data = await response.json();

      if (data.data?.order) {
        const newOrder = transformGraphQLOrder(data.data.order);
        
        if (newOrder) {
          // Add new order to the beginning of the array
          currentOrders.unshift(newOrder);
          
          // Keep only the most recent 50 orders
          if (currentOrders.length > 50) {
            currentOrders = currentOrders.slice(0, 50);
          }
          
          // Save updated orders to MongoDB
          await saveRecentOrders(shop, currentOrders);
          
          console.log(`Saved new order notification for ${shop}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing orders/create webhook for ${shop}:`, error);
  }

  return new Response();
};

/**
 * Transform GraphQL order to notification format
 */
function transformGraphQLOrder(order) {
  try {
    // Get first line item
    const lineItem = order.lineItems.edges.length > 0 ? order.lineItems.edges[0].node : null;
    if (!lineItem) {
      return null;
    }

    // Get customer info
    const customer = order.customer;
    if (!customer) {
      return null;
    }

    // Build location string
    const parts = [];
    if (order.shippingAddress?.city) parts.push(order.shippingAddress.city);
    if (order.shippingAddress?.province) parts.push(order.shippingAddress.province);
    if (order.shippingAddress?.country) parts.push(order.shippingAddress.country);
    const location = parts.length > 0 ? parts.join(', ') : 'Unknown Location';
    
    // Get customer name
    const customerName = customer.displayName || 
                        `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 
                        'Someone';
    
    // Get product image
    const productImage = lineItem.variant?.image?.url || 
                        'https://burst.shopifycdn.com/photos/green-t-shirt.jpg';

    return {
      customer: customerName,
      location: location,
      product: lineItem.title || 'an item',
      productImage: productImage,
      productUrl: lineItem.product?.handle ? `/products/${lineItem.product.handle}` : '#',
      time: 'just now',
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error transforming GraphQL order:', error);
    return null;
  }
}

