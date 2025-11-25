import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Page, Layout, Box } from "@shopify/polaris";
import LowAlertTabSection from "../components/LowAlertTabSection";
import LowAlertPreview from "../components/LowAlertPreview";
import Savebar from "../components/Savebar";
import { authenticate } from "../shopify.server";
import { getLowStockSettings } from "../lowStockSettingsRepository.server";

/**
 * Load settings when the page opens
 */
export async function loader({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    const savedSettings = await getLowStockSettings(session.shop);
    return json({ savedSettings: savedSettings || {} });
  } catch (error) {
    console.error("[LowStock Loader] Failed to load low stock settings:", error);
    return json({ savedSettings: {} });
  }
}

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

// Default settings
const defaultSettings = {
  customMessage: "",
  lowStockThreshold: "10",
  alertPosition: "top-left",
  showAlertFor: "",
  showAlert: "all-page",
  specificPageUrl: "",
  timeBeforeFirstAlert: "",
  gapBetweenAlerts: "",
  showCloseButton: false,
  fontFamily: "Arial, sans-serif",
  fontSize: 14,
  icon: "warning",
  animationEffect: "fade",
  textColor: "#000000",
};

export default function LowAlert() {
  const { savedSettings } = useLoaderData();
  const fetcher = useFetcher();

  // Merge saved settings with defaults
  const mergedSavedSettings = useMemo(
    () => ({ ...defaultSettings, ...savedSettings }),
    [savedSettings]
  );

  const [settings, setSettings] = useState(mergedSavedSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(mergedSavedSettings);

  const [notification, setNotification] = useState(null);
  const notificationTimeoutRef = useRef(null);

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

  const handleSettingsChange = useCallback((newSettings) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));
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
      setLastSavedSettings(fetcher.data.settings);
      setSettings(fetcher.data.settings);
      showNotification("Saved!");
    } else {
      const message =
        fetcher.data.error || fetcher.data.message || "Failed to save settings";
      showNotification(message, "error");
    }
  }, [fetcher.state, fetcher.data, showNotification]);

  const handleSave = useCallback(() => {
    try {
      const formData = new FormData();
      formData.append("settings", JSON.stringify(settings));
      fetcher.submit(formData, {
        method: "POST",
        action: "/api/low-stock/settings",
      });
    } catch (error) {
      console.error("[LowStock] Failed to submit settings:", error);
      showNotification(error.message || "Failed to save settings", "error");
    }
  }, [fetcher, settings, showNotification]);

  const handleDiscard = useCallback(() => {
    setSettings(lastSavedSettings);
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
        title="Low Stock Alert"
        subtitle="Display alerts when products are running low on stock to create urgency"
        divider
      >
        <Box paddingBlockStart="400">
          <Layout>
            <Layout.Section variant="oneThird">
              <LowAlertTabSection
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />
            </Layout.Section>
            <Layout.Section variant="twoThirds">
              <LowAlertPreview settings={settings} />
            </Layout.Section>
          </Layout>
        </Box>
      </Page>
    </>
  );
}

