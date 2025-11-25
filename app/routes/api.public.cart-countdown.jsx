import { json } from "@remix-run/node";
import { getCartCountdownSettings, getCartCountdownEnabled } from "../cartCountdownSettingsRepository.server";

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    if (!shop) {
      return json(
        { success: false, error: "Missing shop parameter" },
        { 
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Check if campaign is enabled
    const isEnabled = await getCartCountdownEnabled(shop);
    if (!isEnabled) {
      return json({ 
        success: false,
        enabled: false,
        message: 'Campaign is disabled',
        settings: {}
      }, {
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    const settings = await getCartCountdownSettings(shop);
    return json({ success: true, settings: settings || {} }, {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[Cart Countdown Public API] Failed to load settings:", error);
    return json({
      success: false,
      error: error.message || "Failed to load cart countdown settings",
      settings: {},
    }, {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

