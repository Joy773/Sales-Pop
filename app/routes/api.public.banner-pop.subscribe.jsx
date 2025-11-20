import { json } from "@remix-run/node";
import { getBannerSettings } from "../bannerSettingsRepository.server";
import { applyBannerSettingsDefaults } from "../utils/bannerSettingsDefaults";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function loader() {
  return json(
    { success: false, error: "Method not allowed" },
    { status: 405, headers: CORS_HEADERS },
  );
}

export async function action({ request }) {
  try {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return json(
        { success: false, error: "Method not allowed" },
        { status: 405, headers: CORS_HEADERS },
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let payload = {};

    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      const formData = await request.formData();
      payload = Object.fromEntries(formData.entries());
    }

    const shop =
      typeof payload.shop === "string" && payload.shop.trim().length > 0
        ? payload.shop.trim().toLowerCase()
        : null;
    const contact =
      typeof payload.contact === "string" && payload.contact.trim().length > 0
        ? payload.contact.trim()
        : null;

    if (!shop || !contact) {
      return json(
        { success: false, error: "Missing required fields" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Fetch banner settings to retrieve the most recent success message.
    const settings = await getBannerSettings(shop);
    const normalizedSettings = applyBannerSettingsDefaults(settings || {});
    const successMessage =
      normalizedSettings.goal?.successMessage ||
      "Thanks for subscribing! Please check your inbox.";

    // TODO: Persist contact details if/when a collection is defined.

    return json(
      {
        success: true,
        successMessage,
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[BannerPop Subscribe API] Failed to handle subscription:", error);
    return json(
      {
        success: false,
        error: error.message || "Failed to process subscription",
      },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}


