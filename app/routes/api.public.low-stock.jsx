import { json } from "@remix-run/node";
import { getLowStockSettings, getLowStockEnabled } from "../lowStockSettingsRepository.server";
import { getShopifySession } from "../utils/shopifyClient.server";
import { getLowStockProducts } from "../utils/productInventoryUtils.server";

function calculateVariantQuantity(variant) {
  if (!variant) {
    return 0;
  }

  // Use inventoryQuantity directly (doesn't require read_inventory scope)
  if (
    typeof variant.inventoryQuantity === "number" &&
    Number.isFinite(variant.inventoryQuantity)
  ) {
    return variant.inventoryQuantity;
  }

  // Note: inventoryLevels requires read_inventory scope, so we only use inventoryQuantity
  return 0;
}

/**
 * Handle CORS preflight requests
 */
export async function options({ request }) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * GET /api/public/low-stock?shop=myshop.myshopify.com
 * Public API endpoint for the storefront
 * Returns low stock alert settings and product stock information
 */
export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    
    if (!shop) {
      return json(
        { 
          success: false, 
          error: "Missing shop parameter",
          enabled: false,
          settings: {},
          products: []
        },
        { 
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Normalize shop domain
    const normalizedShop = shop.trim().toLowerCase();

    // Validate shop domain format
    if (!normalizedShop.includes(".myshopify.com")) {
      return json(
        { 
          success: false, 
          error: "Invalid shop domain",
          enabled: false,
          settings: {},
          products: []
        },
        { 
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Check if campaign is enabled
    const isEnabled = await getLowStockEnabled(normalizedShop);
    console.log(`[Low Stock Public API] Campaign enabled check: ${isEnabled} for shop: ${normalizedShop}`);
    if (!isEnabled) {
      console.log(`[Low Stock Public API] Campaign is disabled for shop: ${normalizedShop}`);
      return json(
        { 
          success: false,
          enabled: false,
          message: "Campaign is disabled",
          settings: {},
          products: []
        },
        {
          headers: {
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Get low stock settings
    const settings = await getLowStockSettings(normalizedShop);
    console.log(`[Low Stock Public API] Settings loaded from MongoDB:`, {
      hasSettings: !!settings,
      settingsKeys: settings ? Object.keys(settings) : [],
      settings: settings
    });

    // Get Shopify session to query Admin GraphQL
    const session = await getShopifySession(normalizedShop);
    console.log(`[Low Stock Public API] Session found: ${session ? 'yes' : 'no'} for shop: ${normalizedShop}`);
    if (!session) {
      console.error(`[Low Stock Public API] Shop session not found for: ${normalizedShop}`);
      return json(
        {
          success: false,
          enabled: false,
          error: "Shop session not found. Please open the app once to establish a session.",
          settings: settings || {},
          products: []
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const thresholdSetting = Number(settings?.lowStockThreshold);
    const inventoryThreshold =
      Number.isFinite(thresholdSetting) && thresholdSetting > 0
        ? thresholdSetting
        : 10;

    console.log(`[Low Stock Public API] Using inventory threshold: ${inventoryThreshold} (from settings.lowStockThreshold: ${settings?.lowStockThreshold})`);

    let products = [];
    try {
      console.log(`[Low Stock Public API] Fetching low stock products with threshold: ${inventoryThreshold}`);
      const lowStockProducts = await getLowStockProducts(session, inventoryThreshold, {
        first: 50,
      });

      console.log(`[Low Stock Public API] Found ${lowStockProducts?.length || 0} products with low stock`);

      products = (lowStockProducts || []).map((product) => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        status: product.status,
        featuredImage: product.featuredImage?.url || null,
        minStock: product.minStock,
        variants: (product.lowStockVariants || []).map((variant) => ({
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          price: variant.price,
          inventoryQuantity: calculateVariantQuantity(variant),
          inventoryPolicy: variant.inventoryPolicy,
        })),
      }));

      console.log(`[Low Stock Public API] Mapped ${products.length} products with ${products.reduce((sum, p) => sum + (p.variants?.length || 0), 0)} total variants`);
    } catch (productError) {
      console.error("[Low Stock Public API] Failed to fetch low stock products:", productError);
      console.error("[Low Stock Public API] Error stack:", productError.stack);
    }

    return json(
      { 
        success: true, 
        enabled: true,
        settings: settings || {},
        products
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept",
        },
      }
    );
  } catch (error) {
    console.error("[Low Stock Public API] Failed to load settings:", error);
    return json(
      {
        success: false,
        error: error.message || "Failed to load low stock settings",
        enabled: false,
        settings: {},
        products: []
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

