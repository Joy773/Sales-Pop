import { Card, Text, BlockStack, Box, TextField, Select, ChoiceList } from "@shopify/polaris";
import { useState, useEffect, useRef } from "react";

export default function CartTabSection({ settings, onSettingsChange }) {
  const [selectedTab, setSelectedTab] = useState("settings");
  
  // Settings states
  const [showAlert, setShowAlert] = useState(settings?.showAlert || ["notification-bar"]);
  const [countdownTime, setCountdownTime] = useState(settings?.countdownTime || "");
  const [actionAfterExpired, setActionAfterExpired] = useState(settings?.actionAfterExpired || "do-nothing");
  const [customMessage, setCustomMessage] = useState(settings?.customMessage || "");
  const [additionalMessage, setAdditionalMessage] = useState(settings?.additionalMessage || "");
  const [resetTimeOnAddToCart, setResetTimeOnAddToCart] = useState(settings?.resetTimeOnAddToCart || ["false"]);
  const [buttonAction, setButtonAction] = useState(settings?.buttonAction || "checkout-now");
  const [alertPosition, setAlertPosition] = useState(settings?.alertPosition || "bottom-right");
  
  // Box Style states
  const [backgroundColor, setBackgroundColor] = useState(settings?.backgroundColor || "#fff8e6");
  const [borderColor, setBorderColor] = useState(settings?.borderColor || "#e1e3e5");
  const [borderWidth, setBorderWidth] = useState(settings?.borderWidth || 1);
  const [borderRadius, setBorderRadius] = useState(settings?.borderRadius || 8);
  const [useBackgroundImage, setUseBackgroundImage] = useState(settings?.useBackgroundImage || false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(settings?.backgroundImageUrl || "");

  // Font Style states
  const [textSize, setTextSize] = useState(settings?.textSize || 15);
  const [textWeight, setTextWeight] = useState(settings?.textWeight || "bold");
  const [textColor, setTextColor] = useState(settings?.textColor || "#000000");

  // Position states
  const [xPosition, setXPosition] = useState(settings?.xPosition || "right");
  const [yPosition, setYPosition] = useState(settings?.yPosition || "bottom");
  const [xOffset, setXOffset] = useState(settings?.xOffset || "20");
  const [yOffset, setYOffset] = useState(settings?.yOffset || "20");

  const actionAfterExpiredOptions = [
    { label: 'Clear cart', value: 'clear-cart' },
    { label: 'Reset time', value: 'reset-time' },
    { label: 'Do nothing', value: 'do-nothing' },
  ];

  const buttonActionOptions = [
    { label: 'Checkout now', value: 'checkout-now' },
    { label: 'View cart', value: 'view-cart' },
  ];

  const alertPositionOptions = [
    { label: 'Top left', value: 'top-left' },
    { label: 'Top right', value: 'top-right' },
    { label: 'Bottom right', value: 'bottom-right' },
    { label: 'Bottom left', value: 'bottom-left' },
  ];

  const renderSettingsContent = () => {
    return (
      <BlockStack gap="500">
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <ChoiceList
              title="Show Alert"
              choices={[
                { label: "Notification Bar", value: "notification-bar" },
                { label: "Alert Box", value: "alert-box" },
              ]}
              selected={showAlert}
              onChange={setShowAlert}
            />
            <ChoiceList
              title="Reset time whenever add to cart"
              choices={[
                { label: "Yes", value: "true" },
                { label: "No", value: "false" },
              ]}
              selected={resetTimeOnAddToCart}
              onChange={setResetTimeOnAddToCart}
            />
            {showAlert[0] === "alert-box" && (
              <Select
                label="Button action/text"
                options={buttonActionOptions}
                value={buttonAction}
                onChange={setButtonAction}
              />
            )}
            {showAlert[0] === "alert-box" && (
              <Select
                label="Alert position"
                options={alertPositionOptions}
                value={alertPosition}
                onChange={setAlertPosition}
              />
            )}
            <TextField
              label="Countdown time"
              type="number"
              value={countdownTime}
              onChange={setCountdownTime}
              autoComplete="off"
              placeholder="minutes"
              min="0"
            />
            <Select
              label="Action after time expired"
              options={actionAfterExpiredOptions}
              value={actionAfterExpired}
              onChange={setActionAfterExpired}
              placeholder="Select an action"  
            />
            <TextField
              label="Custom message"
              type="text"
              value={customMessage}
              onChange={setCustomMessage}
              autoComplete="off"
              placeholder="Enter custom message"
            />
            {showAlert[0] !== "alert-box" && (
              <TextField
                label="Message after time expired"
                type="text"
                value={additionalMessage}
                onChange={setAdditionalMessage}
                autoComplete="off"
                placeholder="Enter message after time expired"
              />
            )}
          </BlockStack>
        </Box>
      </BlockStack>
    );
  };

  const renderStylesContent = () => {
    return (
      <BlockStack gap="500">
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <label as="h3">Background color</label>
            <div style={{ 
              position: 'relative',
              height: '36px',
              borderRadius: 'var(--p-border-radius-200)',
              border: '1px solid #000000',
              overflow: 'hidden',
              cursor: 'pointer',
              maxWidth: '200px'
            }}>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  top: 0,
                  left: 0,
                  margin: 0,
                  padding: 0,
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: backgroundColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                fontSize: '14px',
                fontFamily: 'monospace',
                padding: '0 12px'
              }}>
                {backgroundColor}
              </div>
            </div>
            <label as="h3">Text Color</label>
            <div style={{ 
              position: 'relative',
              height: '36px',
              borderRadius: 'var(--p-border-radius-200)',
              border: '1px solid #000000',
              overflow: 'hidden',
              cursor: 'pointer',
              maxWidth: '200px'
            }}>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  top: 0,
                  left: 0,
                  margin: 0,
                  padding: 0,
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: textColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'monospace',
                padding: '0 12px'
              }}>
                {textColor}
              </div>
            </div>
            {showAlert[0] !== "alert-box" && (
              <TextField
                label="Text size"
                type="number"
                value={textSize.toString()}
                onChange={(value) => setTextSize(Number(value))}
                autoComplete="off"
                min="0"
              />
            )}
          </BlockStack>
        </Box>
      </BlockStack>
    );
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case "settings":
        return renderSettingsContent();
      case "styles":
        return renderStylesContent();
      default:
        return null;
    }
  };

  // Track if this is the first render
  const isFirstRender = useRef(true);
  
  // Effect to emit settings changes
  useEffect(() => {
    // Skip first render to avoid initial trigger
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    const currentSettings = {
      showAlert,
      countdownTime,
      actionAfterExpired,
      customMessage,
      additionalMessage,
      resetTimeOnAddToCart,
      buttonAction,
      alertPosition,
      backgroundColor,
      borderColor,
      borderWidth,
      borderRadius,
      useBackgroundImage,
      backgroundImageUrl,
      textSize,
      textWeight,
      textColor,
      xPosition,
      yPosition,
      xOffset,
      yOffset,
    };
    
    onSettingsChange(currentSettings);
  }, [
    showAlert,
    countdownTime,
    actionAfterExpired,
    customMessage,
    additionalMessage,
    resetTimeOnAddToCart,
    buttonAction,
    alertPosition,
    backgroundColor,
    borderColor,
    borderWidth,
    borderRadius,
    useBackgroundImage,
    backgroundImageUrl,
    textSize,
    textWeight,
    textColor,
    xPosition,
    yPosition,
    xOffset,
    yOffset,
    onSettingsChange,
  ]);

  return (
    <Card>
      {/* Custom Tab Headers */}
      <div style={{
        display: "flex",
        padding: "4px",
        gap: "4px"
      }}>
        <button
          onClick={() => setSelectedTab("settings")}
          style={{
            flex: 1,
            padding: "12px 16px",
            border: "none",
            outline: "none",
            borderRadius: "var(--p-border-radius-200)",
            background: selectedTab === "settings" ? "var(--p-color-bg-surface-secondary)" : "transparent",
            color: selectedTab === "settings" 
              ? "var(--p-color-text-primary)"
              : "var(--p-color-text)",
            cursor: "pointer",
            fontWeight: "500",
            transition: "all 0.2s ease"
          }}
        >
          Settings
        </button>
        <button
          onClick={() => setSelectedTab("styles")}
          style={{
            flex: 1,
            padding: "12px 16px",
            border: "none",
            outline: "none",
            borderRadius: "var(--p-border-radius-200)",
            background: selectedTab === "styles" ? "var(--p-color-bg-surface-secondary)" : "transparent",
            color: selectedTab === "styles" 
              ? "var(--p-color-text-primary)"
              : "var(--p-color-text)",
            cursor: "pointer",
            fontWeight: "500",
            transition: "all 0.2s ease"
          }}
        >
          Styles
        </button>
      </div>

      {/* Tab Content */}
      <Box paddingBlockStart="400">
        {renderTabContent()}
      </Box>
    </Card>
  );
}
