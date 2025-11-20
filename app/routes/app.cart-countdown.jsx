import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Page, Layout, Box } from "@shopify/polaris";
import CartTabSection from "../components/CartTabSection";
import CartPreview from "../components/CartPreview";
import Savebar from "../components/Savebar";

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

export default function CartCountdown() {
  // Default settings
  const defaultSettings = {
    countdownTime: "",
    actionAfterExpired: "do-nothing",
    customMessage: "",
    additionalMessage: "",
    backgroundColor: "#3b82f6",
    borderColor: "#e1e3e5",
    borderWidth: 1,
    borderRadius: 8,
    useBackgroundImage: false,
    backgroundImageUrl: "",
    textSize: 15,
    textWeight: "bold",
    textColor: "#ffffff",
    xPosition: "right",
    yPosition: "bottom",
    xOffset: "20",
    yOffset: "20",
  };

  const fetcher = useFetcher();
  const [settings, setSettings] = useState(defaultSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(defaultSettings);

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
        action: "/api/cart-countdown/settings",
      });
    } catch (error) {
      console.error("[CartCountdown] Failed to submit settings:", error);
      showNotification(error.message || "Failed to save settings", "error");
    }
  }, [fetcher, settings, showNotification]);

  const handleDiscard = useCallback(() => {
    setSettings(lastSavedSettings);
    showNotification("Changes discarded", "info");
  }, [lastSavedSettings, showNotification]);

  return (
    <>
      <Savebar onSave={handleSave} onDiscard={handleDiscard} isDirty={isDirty} />
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
        title="Cart Countdown"
        subtitle="Display a countdown timer for the cart to encourage customers to purchase"
        divider
      >
        <Box paddingBlockStart="400">
          <Layout>
            <Layout.Section variant="oneThird">
              <CartTabSection
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />
            </Layout.Section>
            <Layout.Section variant="twoThirds">
              <CartPreview settings={settings} />
            </Layout.Section>
          </Layout>
        </Box>
      </Page>
    </>
  );
} 
