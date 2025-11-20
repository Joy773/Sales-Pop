import { Card, Text, BlockStack } from "@shopify/polaris";

export default function CartPreview({ settings }) {
  // Format countdown time from minutes to MM:SS
  const formatCountdownTime = (minutes) => {
    if (!minutes || minutes === "" || isNaN(Number(minutes))) {
      return "00:00";
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
          alignItems: "stretch",
          padding: "0",
          position: "relative",
          overflow: "hidden"
        }}>
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
        </div>
      </BlockStack>
    </Card>
  );
}
