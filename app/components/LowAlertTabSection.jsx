import { Card, Text, BlockStack, Box, TextField, Select, Checkbox } from "@shopify/polaris";
import { useState, useEffect, useRef } from "react";

export default function LowAlertTabSection({ settings, onSettingsChange }) {
  const [selectedTab, setSelectedTab] = useState("settings");
  
  // Settings states
  const [customMessage, setCustomMessage] = useState(settings?.customMessage || "");
  const [lowStockThreshold, setLowStockThreshold] = useState(settings?.lowStockThreshold || "10");
  const [alertPosition, setAlertPosition] = useState(settings?.alertPosition || "top-left");
  const [showAlertFor, setShowAlertFor] = useState(settings?.showAlertFor || "");
  const [timeBeforeFirstAlert, setTimeBeforeFirstAlert] = useState(settings?.timeBeforeFirstAlert || "");
  const [gapBetweenAlerts, setGapBetweenAlerts] = useState(settings?.gapBetweenAlerts || "");
  const [showCloseButton, setShowCloseButton] = useState(settings?.showCloseButton || false);
  
  // Styles states
  const [fontFamily, setFontFamily] = useState(settings?.fontFamily || "Arial, sans-serif");
  const [fontSize, setFontSize] = useState(settings?.fontSize || 14);
  const [icon, setIcon] = useState(settings?.icon || "warning");
  const [animationEffect, setAnimationEffect] = useState(settings?.animationEffect || "fade");
  const [textColor, setTextColor] = useState(settings?.textColor || "#000000");

  const alertPositionOptions = [
    { label: 'Top left', value: 'top-left' },
    { label: 'Top right', value: 'top-right' },
    { label: 'Bottom Left', value: 'bottom-left' },
    { label: 'Bottom right', value: 'bottom-right' },
  ];

  const fontFamilyOptions = [
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  ];

  const iconOptions = [
    { label: 'Warning', value: 'warning' },
    { label: 'Info', value: 'info' },
    { label: 'Alert', value: 'alert' },
    { label: 'Bell', value: 'bell' },
    { label: 'Exclamation', value: 'exclamation' },
    { label: 'Check', value: 'check' },
  ];

  const animationEffectOptions = [
    { label: 'Fade', value: 'fade' },
    { label: 'Slide', value: 'slide' },
    { label: 'Bounce', value: 'bounce' },
    { label: 'Pulse', value: 'pulse' },
    { label: 'Zoom', value: 'zoom' },
    { label: 'None', value: 'none' },
  ];

  // Track if this is the first render
  const isFirstRender = useRef(true);
  // Track if we're syncing from parent to avoid triggering onSettingsChange
  const isSyncingFromParent = useRef(false);
  // Track previous settings to detect changes
  const prevSettingsRef = useRef(settings);
  
  // Effect to sync local state with settings prop when it changes from parent
  useEffect(() => {
    if (!settings) return;
    
    // Check if settings prop has actually changed by comparing with previous
    const prevSettings = prevSettingsRef.current;
    const hasChanged = 
      settings.customMessage !== prevSettings?.customMessage ||
      settings.lowStockThreshold !== prevSettings?.lowStockThreshold ||
      settings.alertPosition !== prevSettings?.alertPosition ||
      settings.showAlertFor !== prevSettings?.showAlertFor ||
      settings.timeBeforeFirstAlert !== prevSettings?.timeBeforeFirstAlert ||
      settings.gapBetweenAlerts !== prevSettings?.gapBetweenAlerts ||
      settings.showCloseButton !== prevSettings?.showCloseButton ||
      settings.fontFamily !== prevSettings?.fontFamily ||
      settings.fontSize !== prevSettings?.fontSize ||
      settings.icon !== prevSettings?.icon ||
      settings.animationEffect !== prevSettings?.animationEffect ||
      settings.textColor !== prevSettings?.textColor;
    
    if (hasChanged) {
      isSyncingFromParent.current = true;
      
      if (settings.customMessage !== undefined) setCustomMessage(settings.customMessage);
      if (settings.lowStockThreshold !== undefined) setLowStockThreshold(settings.lowStockThreshold);
      if (settings.alertPosition !== undefined) setAlertPosition(settings.alertPosition);
      if (settings.showAlertFor !== undefined) setShowAlertFor(settings.showAlertFor);
      if (settings.timeBeforeFirstAlert !== undefined) setTimeBeforeFirstAlert(settings.timeBeforeFirstAlert);
      if (settings.gapBetweenAlerts !== undefined) setGapBetweenAlerts(settings.gapBetweenAlerts);
      if (settings.showCloseButton !== undefined) setShowCloseButton(settings.showCloseButton);
      if (settings.fontFamily !== undefined) setFontFamily(settings.fontFamily);
      if (settings.fontSize !== undefined) setFontSize(settings.fontSize);
      if (settings.icon !== undefined) setIcon(settings.icon);
      if (settings.animationEffect !== undefined) setAnimationEffect(settings.animationEffect);
      if (settings.textColor !== undefined) setTextColor(settings.textColor);
      
      // Update the ref to current settings
      prevSettingsRef.current = settings;
      
      // Reset the flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isSyncingFromParent.current = false;
      }, 0);
    } else {
      // Update ref even if no changes to keep it in sync
      prevSettingsRef.current = settings;
    }
  }, [settings]);
  
  // Effect to emit settings changes when local state changes (user input)
  useEffect(() => {
    // Skip first render to avoid initial trigger
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Skip if we're syncing from parent to avoid infinite loop
    if (isSyncingFromParent.current) {
      return;
    }
    
    const currentSettings = {
      customMessage,
      lowStockThreshold,
      alertPosition,
      showAlertFor,
      timeBeforeFirstAlert,
      gapBetweenAlerts,
      showCloseButton,
      fontFamily,
      fontSize,
      icon,
      animationEffect,
      textColor,
    };
    
    onSettingsChange(currentSettings);
  }, [customMessage, lowStockThreshold, alertPosition, showAlertFor, timeBeforeFirstAlert, gapBetweenAlerts, showCloseButton, fontFamily, fontSize, icon, animationEffect, textColor, onSettingsChange]);

  const renderSettingsContent = () => {
    return (
      <BlockStack gap="500">
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <TextField
              label="Custom message"
              value={customMessage}
              onChange={setCustomMessage}
              multiline
              autoComplete="off"
              placeholder="Enter custom message"
            />
            <TextField
              label="Low stock threshold"
              type="number"
              min={1}
              value={lowStockThreshold}
              onChange={setLowStockThreshold}
              autoComplete="off"
              placeholder="10"
              helpText="Products with inventory at or below this number will trigger alerts"
            />
            <Select
              label="Alert Position"
              options={alertPositionOptions}
              value={alertPosition}
              onChange={setAlertPosition}
              placeholder="Select position"
            />
            <TextField
              label="Show alert for"
              type="number"
              min={0}
              suffix="sec"
              value={showAlertFor}
              onChange={setShowAlertFor}
              autoComplete="off"
              placeholder="Enter seconds"
            />
            <TextField
              label="Time before first alert"
              type="number"
              min={0}
              suffix="sec"
              value={timeBeforeFirstAlert}
              onChange={setTimeBeforeFirstAlert}
              autoComplete="off"
              placeholder="Enter seconds"
            />
            <TextField
              label="Gap between each alert"
              type="number"
              min={0}
              suffix="sec"
              value={gapBetweenAlerts}
              onChange={setGapBetweenAlerts}
              autoComplete="off"
              placeholder="Enter seconds"
            />
            <Box paddingBlockStart="400">
              <Text as="h4" variant="headingMd">Extras</Text>
              <Box paddingBlockStart="200">
                <Checkbox
                  label="Show close button"
                  checked={showCloseButton}
                  onChange={setShowCloseButton}
                  helpText="Adds a close button to the alert"
                />
              </Box>
            </Box>
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
            <Select
              label="Font Family"
              options={fontFamilyOptions}
              value={fontFamily}
              onChange={setFontFamily}
              placeholder="Select font family"
            />
            <TextField
              label="Font Size"
              type="number"
              min={10}
              max={24}
              value={fontSize.toString()}
              onChange={(value) => setFontSize(Number(value))}
              autoComplete="off"
              placeholder="10-24"
            />
            <Select
              label="Icon"
              options={iconOptions}
              value={icon}
              onChange={setIcon}
              placeholder="Select icon"
            />
            <Select
              label="Animation effect"
              options={animationEffectOptions}
              value={animationEffect}
              onChange={setAnimationEffect}
              placeholder="Select animation"
            />
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

