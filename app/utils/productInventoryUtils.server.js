/**
 * Utility functions for fetching product inventory data from Shopify GraphQL Admin API
 * These functions are server-only and should be used in API routes or loaders
 */

import { executeAdminGraphQL, executeGraphQLQuery } from './shopifyClient.server';

function hasAdminGraphQLClient(client) {
  return Boolean(client && typeof client.graphql === 'function');
}

function hasSessionClient(client) {
  return Boolean(client && client.shop && client.accessToken);
}

async function runGraphQLRequest(client, query, variables = {}) {
  if (!client) {
    throw new Error('A valid admin client or session is required to run GraphQL queries');
  }

  if (hasAdminGraphQLClient(client)) {
    return executeAdminGraphQL(client, query, variables);
  }

  if (hasSessionClient(client)) {
    return executeGraphQLQuery(client, query, variables);
  }

  throw new Error('Client must be either an admin GraphQL client or a session with access token');
}

/**
 * Fetch products with their variants and inventory information
 * @param {Object} client - Shopify admin GraphQL client or session
 * @param {Object} options - Query options
 * @param {number} options.first - Number of products to fetch per page (default: 50)
 * @param {string} options.query - Optional query string for filtering products
 * @param {string} options.after - Optional pagination cursor
 * @returns {Promise<Array>} Array of products with variants and inventory data
 */
export async function getProducts(client, options = {}) {
  const { first = 50, query = null, after = null } = options;

  try {
    const graphqlQuery = `
      query getProducts($first: Int!, $query: String, $after: String) {
        products(first: $first, query: $query, after: $after) {
          edges {
            node {
              id
              title
              handle
              status
              featuredImage {
                url
                altText
              }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    inventoryQuantity
                    inventoryPolicy
                    inventoryItem {
                      id
                      tracked
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const variables = {
      first,
      query: query || null,
      after: after || null,
    };

    const data = await runGraphQLRequest(client, graphqlQuery, variables);

    if (!data.products) {
      console.error('[Product Inventory Utils] Invalid GraphQL response:', data);
      throw new Error('Invalid response from Shopify');
    }

    console.log(`[Product Inventory Utils] GraphQL returned ${data.products.edges?.length || 0} products`);

    const products = data.products.edges.map(edge => {
      const product = {
        ...edge.node,
        variants: edge.node.variants.edges.map(variantEdge => ({
          ...variantEdge.node,
          // Note: inventoryLevels removed to avoid requiring read_inventory scope
          // We'll use inventoryQuantity directly instead
          inventoryLevels: []
        }))
      };
      
      // Log first product for debugging
      if (edge === data.products.edges[0]) {
        console.log(`[Product Inventory Utils] Sample product: "${product.title}" (${product.id}), Status: ${product.status}, Variants: ${product.variants.length}`);
        if (product.variants.length > 0) {
          const firstVariant = product.variants[0];
          console.log(`[Product Inventory Utils] Sample variant: "${firstVariant.title}" (${firstVariant.id})`);
          console.log(`[Product Inventory Utils]   - Tracked: ${firstVariant.inventoryItem?.tracked}`);
          console.log(`[Product Inventory Utils]   - InventoryQuantity: ${firstVariant.inventoryQuantity}`);
          console.log(`[Product Inventory Utils]   - Note: Using inventoryQuantity directly (inventoryLevels requires read_inventory scope)`);
        }
      }
      
      return product;
    });

    return {
      products,
      pageInfo: data.products.pageInfo
    };
  } catch (error) {
    console.error('[Product Inventory Utils] Error fetching products:', error);
    throw error;
  }
}

/**
 * Fetch variants for a specific product
 * @param {Object} client - Shopify admin GraphQL client or session
 * @param {string} productId - Product ID (GID format: gid://shopify/Product/123456)
 * @returns {Promise<Array>} Array of product variants with inventory data
 */
export async function getProductVariants(client, productId) {
  try {
    const graphqlQuery = `
      query getProductVariants($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          variants(first: 50) {
            edges {
              node {
                id
                title
                sku
                price
                inventoryQuantity
                inventoryPolicy
                inventoryItem {
                  id
                  tracked
                  inventoryLevels(first: 10) {
                    edges {
                      node {
                        available
                        location {
                          id
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await runGraphQLRequest(client, graphqlQuery, {
      id: productId
    });

    if (!data.product) {
      console.error('[Product Inventory Utils] Product not found:', productId);
      throw new Error('Product not found');
    }

    const variants = data.product.variants.edges.map(edge => ({
      ...edge.node,
      inventoryLevels: edge.node.inventoryItem?.inventoryLevels?.edges.map(levelEdge => ({
        ...levelEdge.node,
        location: levelEdge.node.location
      })) || []
    }));

    return {
      product: {
        id: data.product.id,
        title: data.product.title,
        handle: data.product.handle
      },
      variants
    };
  } catch (error) {
    console.error('[Product Inventory Utils] Error fetching product variants:', error);
    throw error;
  }
}

/**
 * Fetch inventory levels for a specific inventory item
 * @param {Object} client - Shopify admin GraphQL client or session
 * @param {string} inventoryItemId - Inventory Item ID (GID format: gid://shopify/InventoryItem/123456)
 * @param {Array<string>} locationIds - Optional array of location IDs to filter by
 * @returns {Promise<Array>} Array of inventory levels
 */
export async function getInventoryLevels(client, inventoryItemId, locationIds = []) {
  try {
    let graphqlQuery;
    
    if (locationIds.length > 0) {
      // Query specific locations
      const locationIdsString = locationIds.map(id => `"${id}"`).join(', ');
      graphqlQuery = `
        query getInventoryLevels($id: ID!) {
          inventoryItem(id: $id) {
            id
            tracked
            inventoryLevels(first: 10, locationIds: [${locationIdsString}]) {
              edges {
                node {
                  quantities(names: ["available"]) {
                    quantity
                  }
                  location {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      `;
    } else {
      // Query all locations
      graphqlQuery = `
        query getInventoryLevels($id: ID!) {
          inventoryItem(id: $id) {
            id
            tracked
            inventoryLevels(first: 10) {
              edges {
                node {
                  quantities(names: ["available"]) {
                    quantity
                  }
                  location {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      `;
    }

    const data = await runGraphQLRequest(client, graphqlQuery, {
      id: inventoryItemId
    });

    if (!data.inventoryItem) {
      console.error('[Product Inventory Utils] Inventory item not found:', inventoryItemId);
      throw new Error('Inventory item not found');
    }

    const inventoryLevels = data.inventoryItem.inventoryLevels.edges.map(edge => ({
      ...edge.node,
      location: edge.node.location
    }));

    return {
      inventoryItem: {
        id: data.inventoryItem.id,
        tracked: data.inventoryItem.tracked
      },
      inventoryLevels
    };
  } catch (error) {
    console.error('[Product Inventory Utils] Error fetching inventory levels:', error);
    throw error;
  }
}

/**
 * Fetch inventory items for multiple variants
 * @param {Object} client - Shopify admin GraphQL client or session
 * @param {Array<string>} variantIds - Array of variant IDs (GID format)
 * @returns {Promise<Array>} Array of inventory items with their levels
 */
export async function getInventoryItems(client, variantIds) {
  try {
    if (!variantIds || variantIds.length === 0) {
      return [];
    }

    // GraphQL doesn't support querying multiple inventory items directly
    // So we'll fetch them one by one or through product variants
    // For efficiency, we'll use a batch approach by fetching products that contain these variants
    
    const inventoryItems = [];
    
    // Fetch variants to get their inventory item IDs
    const variantQueries = variantIds.map((variantId, index) => {
      return `
        variant${index}: productVariant(id: "${variantId}") {
          id
          title
          inventoryQuantity
          inventoryItem {
            id
            tracked
            inventoryLevels(first: 10) {
              edges {
                node {
                  quantities(names: ["available"]) {
                    quantity
                  }
                  location {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      `;
    }).join('\n');

    const graphqlQuery = `
      query getInventoryItems {
        ${variantQueries}
      }
    `;

    const data = await runGraphQLRequest(client, graphqlQuery);

    if (!data) {
      console.error('[Product Inventory Utils] Invalid GraphQL response:', data);
      throw new Error('Invalid response from Shopify');
    }

    // Process the results
    variantIds.forEach((variantId, index) => {
      const variantData = data[`variant${index}`];
      if (variantData && variantData.inventoryItem) {
        inventoryItems.push({
          variantId: variantData.id,
          variantTitle: variantData.title,
          inventoryQuantity: variantData.inventoryQuantity,
          inventoryItem: {
            id: variantData.inventoryItem.id,
            tracked: variantData.inventoryItem.tracked,
            inventoryLevels: variantData.inventoryItem.inventoryLevels.edges.map(levelEdge => ({
              ...levelEdge.node,
              location: levelEdge.node.location
            }))
          }
        });
      }
    });

    return inventoryItems;
  } catch (error) {
    console.error('[Product Inventory Utils] Error fetching inventory items:', error);
    throw error;
  }
}

/**
 * Get low stock products (products with inventory below a threshold)
 * @param {Object} client - Shopify admin GraphQL client or session
 * @param {number} threshold - Inventory threshold (default: 10)
 * @param {Object} options - Additional query options
 * @param {number} options.first - Page size for fetching products (default: 50)
 * @param {number} options.maxProducts - Maximum number of low stock products to collect (default: 200)
 * @param {string} options.query - Optional search query to narrow products
 * @returns {Promise<Array>} Array of products with low stock variants
 */
export async function getLowStockProducts(client, threshold = 10, options = {}) {
  try {
    const { first = 50, maxProducts = 200, query = null } = options;
    const collectedProducts = [];
    let hasNextPage = true;
    let cursor = null;
    let totalProductsFetched = 0;
    let totalVariantsChecked = 0;
    let variantsNotTracked = 0;
    let variantsZeroOrNegative = 0;
    let variantsAboveThreshold = 0;
    let variantsQualified = 0;

    console.log(`[Low Stock Filter] Starting search with threshold: ${threshold}, maxProducts: ${maxProducts}`);

    while (hasNextPage && collectedProducts.length < maxProducts) {
      const result = await getProducts(client, {
        first,
        query,
        after: cursor,
      });

      if (!result || !result.products) {
        console.log(`[Low Stock Filter] No products returned from GraphQL query`);
        break;
      }

      totalProductsFetched += result.products.length;
      console.log(`[Low Stock Filter] Fetched ${result.products.length} products (total so far: ${totalProductsFetched})`);

      result.products.forEach((product) => {
        const productVariants = product.variants || [];
        console.log(`[Low Stock Filter] Product: "${product.title}" (${product.id}), Status: ${product.status}, Variants: ${productVariants.length}`);

        const lowStockVariants = productVariants.filter((variant) => {
          totalVariantsChecked++;
          
          const tracked = variant.inventoryItem?.tracked;
          const inventoryQty = variant.inventoryQuantity;

          // Calculate total inventory - use inventoryQuantity directly
          // Note: inventoryLevels requires read_inventory scope, so we use inventoryQuantity instead
          const totalInventory = typeof inventoryQty === 'number' && Number.isFinite(inventoryQty)
            ? inventoryQty
            : 0;

          console.log(`[Low Stock Filter]   Variant: "${variant.title || variant.id}" | Tracked: ${tracked} | InventoryQty: ${inventoryQty} | Total: ${totalInventory} | Threshold: ${threshold}`);

          // Check tracking
          if (!tracked) {
            variantsNotTracked++;
            console.log(`[Low Stock Filter]     ❌ Filtered: Not tracked`);
            return false;
          }

          // Check if inventory is zero or negative
          if (totalInventory <= 0) {
            variantsZeroOrNegative++;
            console.log(`[Low Stock Filter]     ❌ Filtered: Inventory is 0 or negative (${totalInventory})`);
            return false;
          }

          // Check if inventory is above threshold
          if (totalInventory > threshold) {
            variantsAboveThreshold++;
            console.log(`[Low Stock Filter]     ❌ Filtered: ${totalInventory} > ${threshold}`);
            return false;
          }

          // This variant qualifies!
          variantsQualified++;
          console.log(`[Low Stock Filter]     ✅ QUALIFIES: ${totalInventory} <= ${threshold}`);
          return true;
        });

        if (lowStockVariants.length > 0) {
          console.log(`[Low Stock Filter] ✓ Product "${product.title}" has ${lowStockVariants.length} qualifying low stock variants`);
          collectedProducts.push({
            ...product,
            lowStockVariants,
            minStock: Math.min(
              ...lowStockVariants.map((variant) => {
                // Use inventoryQuantity directly (inventoryLevels requires read_inventory scope)
                const totalInventory = typeof variant.inventoryQuantity === 'number' && Number.isFinite(variant.inventoryQuantity)
                  ? variant.inventoryQuantity
                  : 0;
                return totalInventory;
              })
            ),
          });
        } else {
          console.log(`[Low Stock Filter] ✗ Product "${product.title}" has no qualifying variants`);
        }
      });

      hasNextPage = Boolean(result.pageInfo?.hasNextPage);
      cursor = result.pageInfo?.endCursor || null;

      if (!hasNextPage) {
        console.log(`[Low Stock Filter] No more pages to fetch`);
        break;
      }
    }

    console.log(`[Low Stock Filter] ===== SUMMARY =====`);
    console.log(`[Low Stock Filter] Total products fetched: ${totalProductsFetched}`);
    console.log(`[Low Stock Filter] Total variants checked: ${totalVariantsChecked}`);
    console.log(`[Low Stock Filter] Variants not tracked: ${variantsNotTracked}`);
    console.log(`[Low Stock Filter] Variants with 0 or negative inventory: ${variantsZeroOrNegative}`);
    console.log(`[Low Stock Filter] Variants above threshold (${threshold}): ${variantsAboveThreshold}`);
    console.log(`[Low Stock Filter] Variants that qualified: ${variantsQualified}`);
    console.log(`[Low Stock Filter] Products with low stock: ${collectedProducts.length}`);
    console.log(`[Low Stock Filter] ====================`);

    return collectedProducts;
  } catch (error) {
    console.error('[Product Inventory Utils] Error fetching low stock products:', error);
    throw error;
  }
}

