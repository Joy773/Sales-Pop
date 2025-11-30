import { Card, Text, BlockStack } from "@shopify/polaris";

export default function CartPreview({ settings }) {
  // Format countdown time from minutes to MM:SS
  const formatCountdownTime = (minutes) => {
    if (!minutes || minutes === "" || isNaN(Number(minutes))) {
      return "01:30"; // Default for preview
    }
    const totalSeconds = Number(minutes) * 60;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Get the display message
  const getDisplayMessage = () => {
    const customMessage = settings?.customMessage || "";
    const countdownTime = formatCountdownTime(settings?.countdownTime);
    
    if (customMessage) {
      // Replace {TIME} placeholder if it exists, otherwise append time
      if (customMessage.includes("{TIME}")) {
        return customMessage.replace("{TIME}", countdownTime);
      }
      return `${customMessage} ${countdownTime}`;
    }
    
    return `Your cart will be abandoned in: ${countdownTime}`;
  };

  // Check which display type is selected
  const showAlert = settings?.showAlert?.[0] || "notification-bar";
  const isAlertBox = showAlert === "alert-box";

  // Calculate progress percentage for circular timer (for alert box)
  const getProgressPercentage = () => {
    const minutes = Number(settings?.countdownTime) || 5;
    const elapsedMinutes = 3.5; // Mock elapsed time for preview
    const progress = ((minutes - elapsedMinutes) / minutes) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const timeString = formatCountdownTime(settings?.countdownTime || 5);
  const progress = isAlertBox ? getProgressPercentage() : 0;
  
  // Calculate stroke-dasharray for circular progress
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  // Calculate position styles for alert box based on alertPosition
  const getAlertPositionStyles = () => {
    const position = settings?.alertPosition || "bottom-right";
    const styles = {
      position: "absolute",
    };

    switch (position) {
      case "top-left":
        styles.top = "20px";
        styles.left = "20px";
        styles.right = "auto";
        styles.bottom = "auto";
        break;
      case "top-right":
        styles.top = "20px";
        styles.right = "20px";
        styles.left = "auto";
        styles.bottom = "auto";
        break;
      case "bottom-right":
        styles.bottom = "20px";
        styles.right = "20px";
        styles.top = "auto";
        styles.left = "auto";
        break;
      case "bottom-left":
        styles.bottom = "20px";
        styles.left = "20px";
        styles.top = "auto";
        styles.right = "auto";
        break;
      default:
        styles.bottom = "20px";
        styles.right = "20px";
        styles.top = "auto";
        styles.left = "auto";
    }

    return styles;
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">Preview Section</Text>
        <div style={{ 
          height: "500px", 
          backgroundColor: "var(--p-color-bg-surface-secondary)",
          borderRadius: "var(--p-border-radius-200)",
          display: "flex",
          flexDirection: "column",
          alignItems: isAlertBox ? "stretch" : "stretch",
          justifyContent: isAlertBox ? "flex-start" : "flex-start",
          padding: "0",
          position: "relative",
          overflow: "hidden"
        }}>
          {isAlertBox ? (
            // Alert Box Preview
            <div
              style={{
                ...getAlertPositionStyles(),
                backgroundColor: settings?.backgroundColor || "#2962FF",
                color: settings?.textColor || "#ffffff",
                borderRadius: "12px",
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: "20px",
                maxWidth: "500px",
                width: "auto",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                fontFamily: "Arial, sans-serif",
              }}
            >
              {/* Circular Countdown Timer */}
              <div style={{ position: "relative", width: "70px", height: "70px", flexShrink: 0 }}>
                <svg width="70" height="70" style={{ transform: "rotate(-90deg)" }}>
                  {/* Background circle */}
                  <circle
                    cx="35"
                    cy="35"
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="4"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="35"
                    cy="35"
                    r={radius}
                    fill="none"
                    stroke={settings?.textColor || "#ffffff"}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 0.3s ease" }}
                  />
                </svg>
                {/* Timer text */}
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  color: settings?.textColor || "#ffffff",
                  fontSize: "18px",
                  fontWeight: "bold",
                  fontFamily: "Arial, sans-serif",
                }}>
                  {timeString}
                </div>
              </div>

              {/* Text Content */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{
                  color: settings?.textColor || "#ffffff",
                  fontSize: "15px",
                  fontWeight: "500",
                  lineHeight: "1.4",
                }}>
                  Your cart will be abandoned
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <a
                    href={settings?.buttonAction === "view-cart" ? "/cart" : "/checkout"}
                    onClick={(e) => e.preventDefault()}
                    style={{
                      color: settings?.textColor || "#ffffff",
                      fontSize: "15px",
                      fontWeight: "500",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    {settings?.buttonAction === "view-cart" ? "View cart" : "Checkout Now"}
                  </a>
                  {/* Info icon */}
                  <div style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: `1.5px solid ${settings?.textColor || "#ffffff"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: settings?.textColor || "#ffffff",
                    fontSize: "12px",
                    fontWeight: "bold",
                    fontFamily: "Arial, sans-serif",
                    flexShrink: 0,
                  }}>
                    i
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Notification Bar Preview (existing)
            <div
              style={{
                width: "100%",
                backgroundColor: settings?.backgroundColor || "#3b82f6",
                color: settings?.textColor || "#ffffff",
                fontSize: `${settings?.textSize || 15}px`,
                fontWeight: settings?.textWeight || "bold",
                fontFamily: "Arial, sans-serif",
                padding: "16px 24px",
                textAlign: "center",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              {getDisplayMessage()}
            </div>
          )}
        </div>
      </BlockStack>
    </Card>
  );
}
