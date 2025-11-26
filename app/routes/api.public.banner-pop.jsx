import { json } from "@remix-run/node";
import { getBannerSettings, getBannerEnabled } from "../bannerSettingsRepository.server";
import { applyBannerSettingsDefaults } from "../utils/bannerSettingsDefaults";

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    if (!shop) {
      return json(
        { success: false, error: "Missing shop parameter" },
        { status: 400 }
      );
    }

    // Check if campaign is enabled
    const isEnabled = await getBannerEnabled(shop);
    if (!isEnabled) {
      return json({ 
        success: false,
        enabled: false,
        message: 'Campaign is disabled',
        settings: applyBannerSettingsDefaults()
      }, {
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    const settings = await getBannerSettings(shop);
    return json({ success: true, settings }, {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[BannerPop Public API] Failed to load settings:", error);
    return json({
        success: false,
        error: error.message || "Failed to load banner settings",
        settings: applyBannerSettingsDefaults(),
    }, {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}


