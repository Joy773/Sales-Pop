import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Layout, Page, Box } from "@shopify/polaris";
import BannerTabSection from "../components/BannerTabSection";
import BannerPreview from "../components/BannerPreview";
import Savebar from "../components/Savebar";
import { authenticate } from "../shopify.server";
import { getBannerSettings } from "../bannerSettingsRepository.server";
import {
  applyBannerSettingsDefaults,
  DEFAULT_BANNER_SETTINGS,
} from "../utils/bannerSettingsDefaults.js";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const savedSettings = await getBannerSettings(session.shop);
    return json({ savedSettings });
  } catch (error) {
    console.error("[BannerPop Loader] Failed to load banner settings:", error);
    return json({ savedSettings: applyBannerSettingsDefaults() });
  }
};

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) {
    return false;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!bKeys.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

export default function BannerPop() {
  const { savedSettings } = useLoaderData();
  const fetcher = useFetcher();

  const mergedSavedSettings = useMemo(
    () => applyBannerSettingsDefaults(savedSettings),
    [savedSettings]
  );

  const [settings, setSettings] = useState(mergedSavedSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(mergedSavedSettings);

  const [notification, setNotification] = useState(null);
  const notificationTimeoutRef = useRef(null);

  useEffect(() => {
    setSettings(mergedSavedSettings);
    setLastSavedSettings(mergedSavedSettings);
  }, [mergedSavedSettings]);

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  const showNotification = useCallback((message, tone = "success") => {
    setNotification({ message, tone });
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, tone === "success" ? 3000 : 5000);
  }, []);

  const handleSettingsChange = useCallback((updater) => {
    setSettings((prev) => {
      const next =
        typeof updater === "function" ? updater(prev) : updater || prev;
      return applyBannerSettingsDefaults(next);
    });
  }, []);

  const isDirty = useMemo(
    () => !deepEqual(settings, lastSavedSettings),
    [settings, lastSavedSettings]
  );

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) {
      return;
    }

    if (fetcher.data.success) {
      const saved = applyBannerSettingsDefaults(fetcher.data.settings);
      setLastSavedSettings(saved);
      setSettings(saved);
      showNotification("Saved!");
    } else {
      const message =
        fetcher.data.error || fetcher.data.message || "Failed to save settings";
      showNotification(message, "error");
    }
  }, [fetcher.state, fetcher.data, showNotification]);

  const handleSave = useCallback(() => {
    try {
      const payload = applyBannerSettingsDefaults(settings);
      if (!payload.behavior) {
        payload.behavior = DEFAULT_BANNER_SETTINGS.behavior;
      }
      const formData = new FormData();
      formData.append("settings", JSON.stringify(payload));
      fetcher.submit(formData, {
        method: "POST",
        action: "/api/banner-pop/settings",
      });
    } catch (error) {
      console.error("[BannerPop] Failed to submit settings:", error);
      showNotification(error.message || "Failed to save settings", "error");
    }
  }, [fetcher, settings, showNotification]);

  const handleDiscard = useCallback(() => {
    setSettings(applyBannerSettingsDefaults(lastSavedSettings));
    showNotification("Changes discarded", "info");
  }, [lastSavedSettings, showNotification]);

  return (
    <>
      <Savebar 
        onSave={handleSave} 
        onDiscard={handleDiscard} 
        isDirty={isDirty} 
        isLoading={fetcher.state === 'submitting' || fetcher.state === 'loading'} 
      />
      {notification && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor:
              notification.tone === "error"
                ? "#d72c0d"
                : notification.tone === "info"
                ? "#1f6f8b"
                : "#2e7d32",
            color: "white",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 9999,
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {notification.message}
        </div>
      )}
      <Page
        title="Custom Popup"
        subtitle="Create banners or popups to engage with shoppers"
        divider
      >
        <Box paddingBlockStart="400">
          <Layout>
            <Layout.Section variant="oneThird">
              <BannerTabSection
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />
            </Layout.Section>
            <Layout.Section variant="twoThirds">
              <BannerPreview settings={settings} />
            </Layout.Section>
          </Layout>
        </Box>
      </Page>
    </>
  );
}