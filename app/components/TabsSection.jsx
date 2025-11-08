import { Card, Text, BlockStack, Box, RadioButton, TextField, Divider, Checkbox, RangeSlider, Select } from "@shopify/polaris";
import { useState, useEffect, useCallback, useRef } from "react";

export function TabsSection({ onStylesChange, onReset, initialStyles }) {
  const [selectedTab, setSelectedTab] = useState("settings");
  const [selectedOrderType, setSelectedOrderType] = useState(initialStyles?.selectedOrderType || "realtime");
  const [lookbackDays, setLookbackDays] = useState(initialStyles?.lookbackDays || "30");
  const [popupInterval, setPopupInterval] = useState(initialStyles?.popupInterval || "1");
  const [popupDuration, setPopupDuration] = useState(initialStyles?.popupDuration || "10");
  const [messageTemplate, setMessageTemplate] = useState(initialStyles?.messageTemplate || "{CUSTOMER} from {LOCATION} bought {PRODUCT}");
  
  // Box Style states
  const [backgroundColor, setBackgroundColor] = useState(initialStyles?.backgroundColor || "#fff8e6");
  const [borderColor, setBorderColor] = useState(initialStyles?.borderColor || "#e1e3e5");
  const [hoverColor, setHoverColor] = useState(initialStyles?.hoverColor || "#ffffff");
  const [borderWidth, setBorderWidth] = useState(initialStyles?.borderWidth || 1);
  const [borderRadius, setBorderRadius] = useState(initialStyles?.borderRadius || 8);
  const [useBackgroundImage, setUseBackgroundImage] = useState(initialStyles?.useBackgroundImage || false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(initialStyles?.backgroundImageUrl || "");

  // Add hideOnMobile state for the checkbox
  const [hideOnMobile, setHideOnMobile] = useState(initialStyles?.hideOnMobile || false);
  const [showCloseButton, setShowCloseButton] = useState(initialStyles?.showCloseButton || false);

  // Font Style states
  const [textSize, setTextSize] = useState(initialStyles?.textSize || 15);
  const [textWeight, setTextWeight] = useState(initialStyles?.textWeight || "bold");
  const [textColor, setTextColor] = useState(initialStyles?.textColor || "#000000");
  const [linkSize, setLinkSize] = useState(initialStyles?.linkSize || 15);
  const [linkWeight, setLinkWeight] = useState(initialStyles?.linkWeight || "bold");
  const [linkColor, setLinkColor] = useState(initialStyles?.linkColor || "#000000");

  // Image Style states
  const [imageSize, setImageSize] = useState(initialStyles?.imageSize || 48);
  const [imageRadius, setImageRadius] = useState(initialStyles?.imageRadius || 8);

  // Position states
  const [xPosition, setXPosition] = useState(initialStyles?.xPosition || "right");
  const [yPosition, setYPosition] = useState(initialStyles?.yPosition || "bottom");
  const [xOffset, setXOffset] = useState(initialStyles?.xOffset || "20");
  const [yOffset, setYOffset] = useState(initialStyles?.yOffset || "20");

  const positionOptions = {
    x: [
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' }
    ],
    y: [
      { label: 'Top', value: 'top' },
      { label: 'Bottom', value: 'bottom' }
    ]
  };

  const fontWeightOptions = [
    { label: 'Normal', value: 'normal' },
    { label: 'Medium', value: '500' },
    { label: 'Semi Bold', value: '600' },
    { label: 'Bold', value: 'bold' },
  ];

  const renderColorField = (label, value, onChange) => {
    return (
      <div style={{width:'50%'}}>
        <Text as="span" variant="bodyMd">{label}</Text>
        <div style={{ 
          flex: 1,
          maxWidth: '120px',
          position: 'relative',
          height: '36px',
          borderRadius: 'var(--p-border-radius-200)',
          border: '1px solid var(--p-color-border-subdued)',
          overflow: 'hidden',
          cursor: 'pointer',
          marginTop:'7px'
        }}>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
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
            backgroundColor: value,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontSize: '14px',
            fontFamily: 'monospace'
          }}>
            {value}
          </div>
        </div>
      </div>
    );
  };

  const renderBoxStyleContent = () => {
    return (
      <BlockStack gap="400">
        {/* Color inputs */}
        {!useBackgroundImage && (
          <div style={{display:'flex'}}>
            {renderColorField("Background", backgroundColor, setBackgroundColor)}
            {renderColorField("Background Hover", hoverColor, setHoverColor)}
          </div>
        )}

        {renderColorField("Border Color", borderColor, setBorderColor)}

        {/* Range Sliders */}
        <RangeSlider
          label="Border Width"
          value={borderWidth}
          onChange={setBorderWidth}
          min={0}
          max={10}
          output
        />

        <RangeSlider
          label="Border Radius"
          value={borderRadius}
          onChange={setBorderRadius}
          min={0}
          max={20}
          output
        />

        {/* Background Image Option */}
        <Checkbox
          label="Use background image"
          checked={useBackgroundImage}
          onChange={setUseBackgroundImage}
        />

        {useBackgroundImage && (
          <TextField
            label="Background Image URL"
            type="text"
            value={backgroundImageUrl}
            onChange={setBackgroundImageUrl}
            autoComplete="off"
            placeholder="Enter image URL"
          />
        )}
      </BlockStack>
    );
  };

  const renderFontStyleBlock = (title, size, setSize, weight, setWeight, color, setColor) => {
    return (
      <BlockStack gap="400">
        <Text as="h4" variant="headingMd">{title}</Text>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <TextField
              label="Text Size"
              type="number"
              value={size.toString()}
              onChange={(value) => setSize(parseInt(value, 10))}
              autoComplete="off"
              min="10"
              max="30"
            />
          </div>
          <div style={{ flex: 1 }}>
            <Select
              label="Font Weight"
              options={fontWeightOptions}
              value={weight}
              onChange={setWeight}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text as="span" variant="bodyMd">Color</Text>
            <div style={{ 
              marginTop: '4px',
              position: 'relative',
              height: '32px',
              borderRadius: 'var(--p-border-radius-200)',
              border: '1px solid var(--p-color-border-subdued)',
              overflow: 'hidden',
              cursor: 'pointer'
            }}>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
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
                backgroundColor: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}>
                {color}
              </div>
            </div>
          </div>
        </div>
      </BlockStack>
    );
  };

  const renderFontStyleContent = () => {
    return (
      <BlockStack gap="500">
        {renderFontStyleBlock('Text Size', textSize, setTextSize, textWeight, setTextWeight, textColor, setTextColor)}
        <Divider />
        {renderFontStyleBlock('Link Size', linkSize, setLinkSize, linkWeight, setLinkWeight, linkColor, setLinkColor)}
      </BlockStack>
    );
  };

  const renderPositionContent = () => {
    return (
      <BlockStack gap="400">
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* X Position */}
          <div style={{ flex: 1 }}>
            <Select
              label="X Position"
              options={positionOptions.x}
              value={xPosition}
              onChange={setXPosition}
            />
          </div>
          {/* Y Position */}
          <div style={{ flex: 1 }}>
            <Select
              label="Y Position"
              options={positionOptions.y}
              value={yPosition}
              onChange={setYPosition}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* X Offset */}
          <div style={{ flex: 1 }}>
            <TextField
              label={`${xPosition === 'left' ? 'Left' : 'Right'} Offset (px)`}
              type="number"
              value={xOffset}
              onChange={setXOffset}
              autoComplete="off"
              min="0"
              max="100"
            />
          </div>
          {/* Y Offset */}
          <div style={{ flex: 1 }}>
            <TextField
              label={`${yPosition === 'top' ? 'Top' : 'Bottom'} Offset (px)`}
              type="number"
              value={yOffset}
              onChange={setYOffset}
              autoComplete="off"
              min="0"
              max="100"
            />
          </div>
        </div>
      </BlockStack>
    );
  };

  const renderSettingsContent = () => {
    return (
      <BlockStack gap="500">
        {/* Import Orders Block */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Import Orders</Text>
            <BlockStack gap="300">
              <RadioButton
                label="Real-time orders"
                helpText="Import orders in real-time as they are created"
                checked={selectedOrderType === "realtime"}
                id="realtime"
                name="orderType"
                onChange={() => setSelectedOrderType("realtime")}
              />
              <BlockStack gap="200">
                <RadioButton
                  label="Lookback days"
                  helpText="Import orders from past days"
                  checked={selectedOrderType === "lookback"}
                  id="lookback"
                  name="orderType"
                  onChange={() => setSelectedOrderType("lookback")}
                />
                {selectedOrderType === "lookback" && (
                  <div style={{ paddingLeft: "24px" }}>
                    <BlockStack gap="200">
                      <TextField
                        type="number"
                        value={lookbackDays}
                        onChange={setLookbackDays}
                        autoComplete="off"
                        min="1"
                        max="60"
                      />
                      <Text as="p" variant="bodySm" color="subdued">
                        Default: 30 days - Maximum: 60 days
                      </Text>
                    </BlockStack>
                  </div>
                )}
              </BlockStack>
            </BlockStack>
          </BlockStack>
        </Box>
        <Divider/>

        {/* Customize Message Block */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Customize Message</Text>
            <BlockStack gap="300">
              <TextField
                value={messageTemplate}
                onChange={setMessageTemplate}
                autoComplete="off"
                multiline={3}
              />
              <Box paddingBlockStart="10">
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" color="subdued">
                    Use {"{CUSTOMER}"}, {"{LOCATION}"}, {"{PRODUCT}"} to populate related data.
                  </Text>
                </BlockStack>
              </Box>
            </BlockStack>
          </BlockStack>
        </Box>
        <Divider/>

        {/* Popup Interval Block */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="100">
            <Text as="h3" variant="headingMd">Popup Interval</Text>
            <BlockStack gap="300">
              <Text as="p" variant="bodyMd" color="subdued">
                Time between each popup
              </Text>
              <TextField
                type="number"
                value={popupInterval}
                onChange={setPopupInterval}
                autoComplete="off"
                min="1"
                max="60"
              />
              <Text as="p" variant="bodySm" color="subdued">
                Default: 1 min - Maximum: 10 min
              </Text>
            </BlockStack>
          </BlockStack>
        </Box>
        <Divider/>

        {/* Popup Duration Block */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="100">
            <Text as="h3" variant="headingMd">Popup Duration</Text>
            <BlockStack gap="300">
              <Text as="p" variant="bodyMd" color="subdued">
                Duration of a popup
              </Text>
              <TextField
                type="number"
                value={popupDuration}
                onChange={setPopupDuration}
                autoComplete="off"
                min="1"
                max="60"
              />
              <Text as="p" variant="bodySm" color="subdued">
                Default: 10 sec - Maximum: 30 sec
              </Text>
            </BlockStack>
          </BlockStack>
        </Box>
        <Divider/>

        {/* Hide on Mobile Block */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Extras</Text>
            <Checkbox
              label="Show close button"
              helpText="Clicking on the input field for this will add a close button to the notification pop-up"
              checked={showCloseButton}
              onChange={setShowCloseButton}
            />
            <Checkbox
              label="Hide on mobile"
              checked={hideOnMobile}
              onChange={setHideOnMobile}
            />
          </BlockStack>
        </Box>
      </BlockStack>
    );
  };

  const renderImageStyleContent = () => {
    return (
      <BlockStack gap="400">
        <RangeSlider
          label="Image Size"
          value={imageSize}
          onChange={setImageSize}
          min={20}
          max={100}
          output
        />
        <RangeSlider
          label="Image Radius"
          value={imageRadius}
          onChange={setImageRadius}
          min={0}
          max={50}
          output
        />
      </BlockStack>
    );
  };

  const renderStylesContent = () => {
    return (
      <BlockStack gap="500">
        {/* Templates Block */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Templates</Text>
            <BlockStack gap="300">
              <Text as="p" variant="bodyMd" color="subdued">
                Choose from predefined templates
              </Text>
            </BlockStack>
          </BlockStack>
        </Box>
        <Divider/>

        {/* Position Block */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Position</Text>
            {renderPositionContent()}
          </BlockStack>
        </Box>
        <Divider/>

        {/* Box Style Block */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Box Style</Text>
            {renderBoxStyleContent()}
          </BlockStack>
        </Box>
        <Divider/>

        {/* Font Style Block */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Font Style</Text>
            {renderFontStyleContent()}
          </BlockStack>
        </Box>
        <Divider/>

        {/* Image Style Block */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Image Style</Text>
            {renderImageStyleContent()}
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

  // Reset function to restore to initialStyles (last saved values)
  const resetToDefaults = useCallback(() => {
    setSelectedOrderType(initialStyles?.selectedOrderType || "realtime");
    setLookbackDays(initialStyles?.lookbackDays || "30");
    setPopupInterval(initialStyles?.popupInterval || "1");
    setPopupDuration(initialStyles?.popupDuration || "10");
    setMessageTemplate(initialStyles?.messageTemplate || "{CUSTOMER} from {LOCATION} bought {PRODUCT}");
    setBackgroundColor(initialStyles?.backgroundColor || "#fff8e6");
    setBorderColor(initialStyles?.borderColor || "#e1e3e5");
    setHoverColor(initialStyles?.hoverColor || "#ffffff");
    setBorderWidth(initialStyles?.borderWidth || 1);
    setBorderRadius(initialStyles?.borderRadius || 8);
    setUseBackgroundImage(initialStyles?.useBackgroundImage || false);
    setBackgroundImageUrl(initialStyles?.backgroundImageUrl || "");
    setHideOnMobile(initialStyles?.hideOnMobile || false);
    setShowCloseButton(initialStyles?.showCloseButton || false);
    setTextSize(initialStyles?.textSize || 15);
    setTextWeight(initialStyles?.textWeight || "bold");
    setTextColor(initialStyles?.textColor || "#000000");
    setLinkSize(initialStyles?.linkSize || 15);
    setLinkWeight(initialStyles?.linkWeight || "bold");
    setLinkColor(initialStyles?.linkColor || "#000000");
    setImageSize(initialStyles?.imageSize || 48);
    setImageRadius(initialStyles?.imageRadius || 8);
    setXPosition(initialStyles?.xPosition || "right");
    setYPosition(initialStyles?.yPosition || "bottom");
    setXOffset(initialStyles?.xOffset || "20");
    setYOffset(initialStyles?.yOffset || "20");
  }, [initialStyles]);

  // Expose reset function to parent
  useEffect(() => {
    if (onReset) {
      onReset.current = resetToDefaults;
    }
  }, [onReset, resetToDefaults]);

  // Track if this is the first render
  const isFirstRender = useRef(true);
  
  // Effect to emit style changes - only when values actually change
  useEffect(() => {
    // Skip first render to avoid initial trigger
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    const currentStyles = {
      // Settings
      selectedOrderType,
      lookbackDays,
      popupInterval,
      popupDuration,
      messageTemplate,
      // Styles
      backgroundColor,
      borderColor,
      borderWidth,
      borderRadius,
      hoverColor,
      textSize,
      textWeight,
      textColor,
      linkSize,
      linkWeight,
      linkColor,
      imageSize,
      imageRadius,
      useBackgroundImage,
      backgroundImageUrl,
      xPosition,
      yPosition,
      xOffset,
      yOffset,
      hideOnMobile,
      showCloseButton,
    };
    
    // Always call onStylesChange when dependencies change (they only change on user input)
    onStylesChange(currentStyles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Only include state values - onStylesChange is memoized in parent and stable
    selectedOrderType,
    lookbackDays,
    popupInterval,
    popupDuration,
    messageTemplate,
    backgroundColor,
    borderColor,
    borderWidth,
    borderRadius,
    hoverColor,
    textSize,
    textWeight,
    textColor,
    linkSize,
    linkWeight,
    linkColor,
    imageSize,
    imageRadius,
    useBackgroundImage,
    backgroundImageUrl,
    xPosition,
    yPosition,
    xOffset,
    yOffset,
    hideOnMobile,
    showCloseButton,
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