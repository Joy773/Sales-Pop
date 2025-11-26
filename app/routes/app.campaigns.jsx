import { json } from "@remix-run/node";
import { Page, Layout, Grid } from "@shopify/polaris";
import { CampaignCard } from "../components/CampaignCard";
import { useNavigate, useLoaderData, useFetcher } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";

const CAMPAIGNS = [
  // {
  //   type: "Sales Pop",
  //   title: "Sales pop- Social Proof",
  //   subtitle: "Show recently purchased orders to build trust and FOMO (fear of missing out).",
  //   image: null,
  //   link: "/app/sales-pop",
  //   key: "sales-pop"
  // },
  // {
  //   type: "Visitors Count",
  //   title: "Visitor Count- Social Proof",
  //   subtitle: "Display the number of visitors at a specific time to show how popular your store is.",
  //   image: null,
  //   link: "/app/visitor-count",
  //   key: "visitor-count"
  // },
  // {
  //   type: "Order Count",
  //   title: "Sold Count- Social Proof",
  //   subtitle: "Show the number of successful orders to encourage customers to purchase.",
  //   image: null,
  //   link: "/app/order-count",
  //   key: "order-count"
  // },
  {
    type: "Custom Popup",
    title: "Banner Popup",
    subtitle: "Create coupon or newsletter banner to interact with your customer on your store",
    image: null,
    link: "/app/banner-pop",
    key: "banner-pop"
  },
  {
    type: "Cart Countdown",
    title: "Cart Countdown",
    subtitle: "Display a countdown timer for the cart to encourage customers to purchase.",
    image: null,
    link: "/app/cart-countdown",
    key: "cart-countdown"
  },
  {
    type: "Low Stock",
    title: "Low Stock Alert",
    subtitle: "Show stock levels to create urgency and encourage quick purchases.",
    image: null,
    link: "/app/low-stock",
    key: "low-stock"
  }
];

export const loader = async ({ request }) => {
  try {
    // Import server-only modules inside the loader
    const { hasSalesPopStyles, getSalesPopEnabled } = await import("../stylesRepository.server");
    const { getVisitorCountSettings, getVisitorCountEnabled } = await import("../visitorSettingsRepository.server");
    const { getCartCountdownSettings, getCartCountdownEnabled } = await import("../cartCountdownSettingsRepository.server");
    const { getBannerEnabled } = await import("../bannerSettingsRepository.server");
    const { getLowStockSettings, getLowStockEnabled } = await import("../lowStockSettingsRepository.server");
    const clientPromise = (await import("../db.mongo.server.js")).default;

    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    // Helper function to check banner settings
    async function checkBannerSettingsExist(shop) {
      try {
        const normalizedShop = shop.trim().toLowerCase();
        const client = await clientPromise;
        const db = client.db('salespop');
        const collection = db.collection('banner_pop_settings');
        const existing = await collection.findOne({ shop: normalizedShop });
        // Check if settings exist and are not just defaults
        if (existing && existing.settings) {
          // Check if it has meaningful data (not just default empty structure)
          const settings = existing.settings;
          return !!(settings.goal?.popupTitle || settings.styles?.selectedTemplate);
        }
        return false;
      } catch (error) {
        console.error('[Campaigns] Error checking banner settings:', error);
        return false;
      }
    }

    // Check if each campaign has been created and get enabled state
    const campaignStatus = {};
    const campaignEnabled = {};

    // Sales Pop
    try {
      campaignStatus["sales-pop"] = await hasSalesPopStyles(shop);
      if (campaignStatus["sales-pop"]) {
        campaignEnabled["sales-pop"] = await getSalesPopEnabled(shop);
      }
    } catch (error) {
      console.error('[Campaigns] Error checking sales pop:', error);
      campaignStatus["sales-pop"] = false;
    }

    // Visitor Count
    try {
      const visitorSettings = await getVisitorCountSettings(shop);
      campaignStatus["visitor-count"] = visitorSettings !== null && Object.keys(visitorSettings).length > 0;
      if (campaignStatus["visitor-count"]) {
        campaignEnabled["visitor-count"] = await getVisitorCountEnabled(shop);
      }
    } catch (error) {
      console.error('[Campaigns] Error checking visitor count:', error);
      campaignStatus["visitor-count"] = false;
    }

    // Banner Pop
    try {
      campaignStatus["banner-pop"] = await checkBannerSettingsExist(shop);
      if (campaignStatus["banner-pop"]) {
        campaignEnabled["banner-pop"] = await getBannerEnabled(shop);
      }
    } catch (error) {
      console.error('[Campaigns] Error checking banner pop:', error);
      campaignStatus["banner-pop"] = false;
    }

    // Cart Countdown
    try {
      const cartSettings = await getCartCountdownSettings(shop);
      campaignStatus["cart-countdown"] = cartSettings !== null && Object.keys(cartSettings).length > 0;
      if (campaignStatus["cart-countdown"]) {
        campaignEnabled["cart-countdown"] = await getCartCountdownEnabled(shop);
      }
    } catch (error) {
      console.error('[Campaigns] Error checking cart countdown:', error);
      campaignStatus["cart-countdown"] = false;
    }

    // Low Stock
    try {
      const lowStockSettings = await getLowStockSettings(shop);
      campaignStatus["low-stock"] = lowStockSettings !== null && Object.keys(lowStockSettings).length > 0;
      if (campaignStatus["low-stock"]) {
        campaignEnabled["low-stock"] = await getLowStockEnabled(shop);
      }
    } catch (error) {
      console.error('[Campaigns] Error checking low stock:', error);
      campaignStatus["low-stock"] = false;
    }

    // Order Count - not implemented yet
    campaignStatus["order-count"] = false;

    return json({ campaignStatus, campaignEnabled });
  } catch (error) {
    console.error('[Campaigns] Error in loader:', error);
    return json({ campaignStatus: {}, campaignEnabled: {} });
  }
};

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const campaignKey = formData.get("campaignKey");
    const enabled = formData.get("enabled") === "true";

    // Import the appropriate setter function based on campaign key
    let setEnabledFunction;
    switch (campaignKey) {
      case "sales-pop":
        const { setSalesPopEnabled } = await import("../stylesRepository.server");
        setEnabledFunction = setSalesPopEnabled;
        break;
      case "visitor-count":
        const { setVisitorCountEnabled } = await import("../visitorSettingsRepository.server");
        setEnabledFunction = setVisitorCountEnabled;
        break;
      case "banner-pop":
        const { setBannerEnabled } = await import("../bannerSettingsRepository.server");
        setEnabledFunction = setBannerEnabled;
        break;
      case "cart-countdown":
        const { setCartCountdownEnabled } = await import("../cartCountdownSettingsRepository.server");
        setEnabledFunction = setCartCountdownEnabled;
        break;
      case "low-stock":
        const { setLowStockEnabled } = await import("../lowStockSettingsRepository.server");
        setEnabledFunction = setLowStockEnabled;
        break;
      default:
        return json({ success: false, error: "Invalid campaign key" }, { status: 400 });
    }

    await setEnabledFunction(shop, enabled);
    return json({ success: true, enabled, campaignKey });
  } catch (error) {
    console.error('[Campaigns] Error in action:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export default function Campaigns() {
  const navigate = useNavigate();
  const { campaignStatus, campaignEnabled: initialCampaignEnabled } = useLoaderData();
  const fetcher = useFetcher();
  
  // Track optimistic enabled state for each campaign
  const [optimisticEnabled, setOptimisticEnabled] = useState(initialCampaignEnabled || {});
  const [pendingToggle, setPendingToggle] = useState(null);

  // Handle server response - update state on success, revert on error
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.success && fetcher.data.campaignKey) {
        // Server update successful - confirm the optimistic state
        setOptimisticEnabled(prev => ({
          ...prev,
          [fetcher.data.campaignKey]: fetcher.data.enabled
        }));
        setPendingToggle(null);
      } else if (fetcher.data.success === false && pendingToggle) {
        // Server update failed - revert to previous state
        setOptimisticEnabled(prev => ({
          ...prev,
          [pendingToggle.campaignKey]: pendingToggle.previousValue
        }));
        setPendingToggle(null);
      }
    }
  }, [fetcher.state, fetcher.data, pendingToggle]);

  const handleCreateClick = (link) => {
    console.log('[Campaigns] Navigating to:', link);
    try {
    navigate(link);
    } catch (error) {
      console.error('[Campaigns] Navigation error:', error);
      // Fallback to window.location
      window.location.href = link;
    }
  };

  const handleToggleChange = (campaignKey, enabled) => {
    // Store previous value in case we need to revert
    const previousValue = optimisticEnabled[campaignKey] ?? (initialCampaignEnabled[campaignKey] || false);
    
    // Update optimistic state immediately for instant UI feedback
    setOptimisticEnabled(prev => ({
      ...prev,
      [campaignKey]: enabled
    }));

    // Store pending toggle info for error handling
    setPendingToggle({ campaignKey, previousValue });

    // Then sync with server
    const formData = new FormData();
    formData.append("campaignKey", campaignKey);
    formData.append("enabled", enabled.toString());
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <Page
      title="Campaigns"
      divider
    >
      <Layout>
        <Layout.Section>
          <Grid gap="400">
            {CAMPAIGNS.map((campaign, index) => (
              <Grid.Cell key={index} columnSpan={{ xs: 6, sm: 3, md: 4, lg: 4 }}>
                <CampaignCard 
                  {...campaign} 
                  link={campaign.link}
                  onCreateClick={() => handleCreateClick(campaign.link)}
                  isCreated={campaignStatus[campaign.key] || false}
                  isEnabled={optimisticEnabled[campaign.key] ?? (initialCampaignEnabled[campaign.key] || false)}
                  onToggleChange={handleToggleChange}
                  campaignKey={campaign.key}
                />
              </Grid.Cell>
            ))}
          </Grid>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 