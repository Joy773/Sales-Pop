import { Card, Text, BlockStack, Box, Divider, Checkbox, Select, TextField } from "@shopify/polaris";
import { useState, useEffect, useCallback, useRef } from "react";

export function VisitorsTabSection({ onSettingsChange, onReset, initialSettings }) {
  const [selectedTab, setSelectedTab] = useState("settings");
  
  // Settings states
  const [displayOnPage, setDisplayOnPage] = useState(initialSettings?.displayOnPage || "all");
  const [excludedPages, setExcludedPages] = useState(initialSettings?.excludedPages || "");
  const [verticalPosition, setVerticalPosition] = useState(initialSettings?.verticalPosition || "top");
  const [horizontalPosition, setHorizontalPosition] = useState(initialSettings?.horizontalPosition || "left");
  const [positionSelect, setPositionSelect] = useState(initialSettings?.positionSelect || "today");
  const [positionValue, setPositionValue] = useState(initialSettings?.positionValue || "today");
  const [topSelectValue, setTopSelectValue] = useState(initialSettings?.topSelectValue || "");
  const [leftSelectValue, setLeftSelectValue] = useState(initialSettings?.leftSelectValue || "");
  const [message, setMessage] = useState(initialSettings?.message || "{NUMBER} people visited\nin last 30 minutes");
  const [hidePopupThreshold, setHidePopupThreshold] = useState(initialSettings?.hidePopupThreshold || "0");
  const [popupDuration, setPopupDuration] = useState(initialSettings?.popupDuration || "10");
  const [delayBeforeFirstPop, setDelayBeforeFirstPop] = useState(initialSettings?.delayBeforeFirstPop || "8");

  const handlePositionSelectChange = useCallback(
    (value) => setPositionValue(value),
    []
  );

  const positionSelectOptions = [
    { label: 'Top left', value: 'top left' },
    { label: 'Top right', value: 'top right' },
    { label: 'Bottom left', value: 'bottom left' },
    { label: 'Bottom right', value: 'bottom right' },
  ];

  const handleSelectChange = useCallback(
    (value) => setPositionSelect(value),
    []
  );

  const positionOptions = [
    { label: 'Homepage', value: 'homepage' },
    { label: 'All pages', value: 'all pages' },
    { label: 'Any page except following pages:', value: 'except pages' },
  ];
  const [showCloseButton, setShowCloseButton] = useState(initialSettings?.showCloseButton || false);
  const [hideOnMobile, setHideOnMobile] = useState(initialSettings?.hideOnMobile || false);

  // Styles states
  const [shape, setShape] = useState(initialSettings?.shape || "circle");
  const [borderRadius, setBorderRadius] = useState(initialSettings?.borderRadius || 8);
  const [backgroundColor, setBackgroundColor] = useState(initialSettings?.backgroundColor || "#FFFFFF");
  const [highlightColor, setHighlightColor] = useState(initialSettings?.highlightColor || "#4E9611");
  const [textColor, setTextColor] = useState(initialSettings?.textColor || "#3F3F3F");
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showHighlightPalette, setShowHighlightPalette] = useState(false);
  const [showTextPalette, setShowTextPalette] = useState(false);

  const handleShapeChange = useCallback(
    (value) => setShape(value),
    []
  );

  const shapeOptions = [
    { label: 'Circle', value: 'circle' },
    { label: 'Square', value: 'square' },
    { label: 'Rounded', value: 'rounded' },
  ];

  const renderColorField = (label, value, onChange, showPalette = false) => {
    const colorPalette = [
      '#FFFFFF', '#F5F5F5', '#E0E0E0', '#BDBDBD', '#9E9E9E',
      '#757575', '#616161', '#424242', '#212121', '#000000',
      '#FFEBEE', '#FCE4EC', '#F3E5F5', '#E1BEE7', '#CE93D8',
      '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2',
      '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5',
      '#2196F3', '#1E88E5', '#1976D2', '#1565C0', '#0D47A1',
      '#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A',
      '#4CAF50', '#43A047', '#388E3C', '#2E7D32', '#1B5E20',
      '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726',
      '#FF9800', '#FB8C00', '#F57C00', '#EF6C00', '#E65100',
      '#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350',
      '#F44336', '#E53935', '#D32F2F', '#C62828', '#B71C1C'
    ];

    return (
      <div style={{ width: '100%' }}>
        <Text as="span" variant="bodyMd" fontWeight="medium">{label}</Text>
        <div style={{ 
          marginTop: '8px',
          position: 'relative',
          width: '100%'
        }}>
          <div style={{ position: 'relative' }}>
            <TextField
              value={value}
              onChange={onChange}
              autoComplete="off"
            />
            <div style={{ 
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '24px',
              height: '24px',
              borderRadius: 'var(--p-border-radius-200)',
              border: '1px solid var(--p-color-border-subdued)',
              overflow: 'hidden',
              cursor: 'pointer',
              zIndex: 1
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
                  cursor: 'pointer',
                  zIndex: 2
                }}
              />
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
                backgroundColor: value,
                pointerEvents: 'none',
                zIndex: 1
              }} />
            </div>
            {showPalette && (
              <button
                onClick={() => setShowColorPalette(!showColorPalette)}
                style={{
                  marginTop: '8px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid var(--p-color-border-subdued)',
                  borderRadius: '4px',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--p-color-text)'
                }}
              >
                {showColorPalette ? 'Hide palette' : 'Show palette'}
              </button>
            )}
          </div>
          {showPalette && showColorPalette && (
            <div style={{
              marginTop: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gap: '4px'
            }}>
              {colorPalette.map((color) => (
                <button
                  key={color}
                  onClick={() => onChange(color)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: value === color ? '2px solid #000' : '1px solid var(--p-color-border-subdued)',
                    backgroundColor: color,
                    cursor: 'pointer',
                    padding: 0,
                    outline: 'none'
                  }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSettingsContent = () => {
    return (
      <BlockStack gap="500">
        {/* Information Banner */}
        <div style={{
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#1976d2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px'
          }}>
            <span style={{
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              lineHeight: '1'
            }}>i</span>
          </div>
          <Text as="p" variant="bodyMd" style={{ color: '#000000', margin: 0 }}>
            The Visitor Count displays the number of visits to your site in the last 30 minutes.
          </Text>
        </div>

        {/* Position & Display Section */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Position & Display</Text>
            <Select
              label="Display on page"
              options={positionOptions}
              onChange={handleSelectChange}
              value={positionSelect}
            />
            {positionSelect === 'except pages' && (
              <TextField
                label="Excluded page URLs"
                value={excludedPages}
                onChange={setExcludedPages}
                multiline={4}
                autoComplete="off"
                placeholder="Enter one URL per line, e.g.&#10;/products/example&#10;/collections/example"
                helpText="Enter one URL per line. The visitor count will not show on these pages."
              />
            )}
          </BlockStack>
        </Box>

        {/* Position Section */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="100">
            <Text as="span" variant="bodyMd" fontWeight="medium">Position</Text>
            <Select
              options={positionSelectOptions}
              onChange={handlePositionSelectChange}
              value={positionValue}
            />
            <Box paddingBlockStart="400">
              <BlockStack gap="300">
                {(() => {
                  const positionParts = (positionValue || 'top left').split(' ');
                  const verticalLabel = positionParts[0] ? positionParts[0].charAt(0).toUpperCase() + positionParts[0].slice(1) : 'Top';
                  const horizontalLabel = positionParts[1] ? positionParts[1].charAt(0).toUpperCase() + positionParts[1].slice(1) : 'Left';
                  
                  return (
                    <>
                      <BlockStack gap="200">
                        <Text as="span" variant="bodyMd" fontWeight="medium">{verticalLabel}</Text>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <div style={{ position: 'relative' }}>
                            <TextField
                              type="number"
                              value={topSelectValue}
                              onChange={setTopSelectValue}
                              autoComplete="off"
                            />
                            <span style={{
                              position: 'absolute',
                              right: '50px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              pointerEvents: 'none',
                              color: '#6B7280',
                              fontSize: '14px',
                              lineHeight: '1',
                              zIndex: 1
                            }}>
                              pixels
                            </span>
                          </div>
                        </div>
                      </BlockStack>
                      <BlockStack gap="200">
                        <Text as="span" variant="bodyMd" fontWeight="medium">{horizontalLabel}</Text>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <div style={{ position: 'relative' }}>
                            <TextField
                              type="number"
                              value={leftSelectValue}
                              onChange={setLeftSelectValue}
                              autoComplete="off"
                            />
                            <span style={{
                              position: 'absolute',
                              right: '50px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              pointerEvents: 'none',
                              color: '#6B7280',
                              fontSize: '14px',
                              lineHeight: '1',
                              zIndex: 1
                            }}>
                              pixels
                            </span>
                          </div>
                        </div>
                      </BlockStack>
                    </>
                  );
                })()}
                <div style={{ width: '100%', marginTop: '16px', marginBottom: '16px' }}>
                  <Divider />
                </div>
                
                {/* Message Section */}
                <BlockStack gap="200">
                  <Text as="span" variant="bodyMd" fontWeight="medium">Message</Text>
                  <TextField
                    value={message}
                    onChange={setMessage}
                    multiline={2}
                    autoComplete="off"
                    style={{ minHeight: '80px' }}
                  />
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" color="subdued">
                      Only support 2-line content.
                    </Text>
                    <Text as="p" variant="bodySm" color="subdued">
                      Keep {"{NUMBER}"} & {"{TIME}"} to populate related data.
                    </Text>
                  </BlockStack>
                </BlockStack>

                {/* Hide popup if {NUMBER} is less than... Section */}
                <BlockStack gap="200">
                  <Text as="span" variant="bodyMd" fontWeight="medium">Hide popup if {"{NUMBER}"} is less than...</Text>
                  <TextField
                    type="number"
                    value={hidePopupThreshold}
                    onChange={setHidePopupThreshold}
                    autoComplete="off"
                  />
                </BlockStack>

                {/* Duration of a popup Section */}
                <BlockStack gap="200">
                  <Text as="span" variant="bodyMd" fontWeight="medium">Duration of a popup</Text>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <div style={{ position: 'relative' }}>
                      <TextField
                        type="number"
                        value={popupDuration}
                        onChange={setPopupDuration}
                        autoComplete="off"
                      />
                      <span style={{
                        position: 'absolute',
                        right: '50px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: '#6B7280',
                        fontSize: '14px',
                        lineHeight: '1',
                        zIndex: 1
                      }}>
                        seconds
                      </span>
                    </div>
                  </div>
                </BlockStack>

                {/* Delay before first pop shows Section */}
                <BlockStack gap="200">
                  <Text as="span" variant="bodyMd" fontWeight="medium">Delay before first pop shows</Text>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <div style={{ position: 'relative' }}>
                      <TextField
                        type="number"
                        value={delayBeforeFirstPop}
                        onChange={setDelayBeforeFirstPop}
                        autoComplete="off"
                      />
                      <span style={{
                        position: 'absolute',
                        right: '50px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: '#6B7280',
                        fontSize: '14px',
                        lineHeight: '1',
                        zIndex: 1
                      }}>
                        seconds
                      </span>
                    </div>
                  </div>
                </BlockStack>
              </BlockStack>
            </Box>
          </BlockStack>
        </Box>

        <Divider />

        {/* Extras Section */}
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Extras</Text>
            <Checkbox
              label="Show close button"
              checked={showCloseButton}
              onChange={setShowCloseButton}
              helpText="Adds a close button to the visitor count widget"
            />
            <Checkbox
              label="Hide on mobile"
              checked={hideOnMobile}
              onChange={setHideOnMobile}
              helpText="Hides the visitor count widget on mobile devices"
            />
          </BlockStack>
        </Box>
      </BlockStack>
    );
  };


  const renderStylesContent = () => {
    return (
      <BlockStack gap="500">
        <Box paddingInlineStart="400" paddingInlineEnd="400">
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">Styling</Text>
            
            {/* Shape */}
            <BlockStack gap="300">
              <Select
                label="Shape"
                options={shapeOptions}
                onChange={handleShapeChange}
                value={shape}
              />
            </BlockStack>

            {/* Background Color */}
            <BlockStack gap="300">
              {renderColorField("Background color", backgroundColor, setBackgroundColor, true)}
            </BlockStack>

            {/* Highlight Color */}
            <BlockStack gap="100">
              {renderColorField("Highlight color (link & icons color)", highlightColor, setHighlightColor)}
              <button
                onClick={() => setShowHighlightPalette(!showHighlightPalette)}
                style={{
                  marginTop: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid var(--p-color-border-subdued)',
                  borderRadius: '4px',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--p-color-text)',
                  alignSelf: 'flex-start'
                }}
              >
                {showHighlightPalette ? 'Hide palette' : 'Show palette'}
              </button>
              {showHighlightPalette && (
                <div style={{
                  marginTop: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: '4px'
                }}>
                  {[
                    '#FFFFFF', '#F5F5F5', '#E0E0E0', '#BDBDBD', '#9E9E9E',
                    '#757575', '#616161', '#424242', '#212121', '#000000',
                    '#FFEBEE', '#FCE4EC', '#F3E5F5', '#E1BEE7', '#CE93D8',
                    '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2',
                    '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5',
                    '#2196F3', '#1E88E5', '#1976D2', '#1565C0', '#0D47A1',
                    '#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A',
                    '#4CAF50', '#43A047', '#388E3C', '#2E7D32', '#1B5E20',
                    '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726',
                    '#FF9800', '#FB8C00', '#F57C00', '#EF6C00', '#E65100',
                    '#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350',
                    '#F44336', '#E53935', '#D32F2F', '#C62828', '#B71C1C'
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => setHighlightColor(color)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: highlightColor === color ? '2px solid #000' : '1px solid var(--p-color-border-subdued)',
                        backgroundColor: color,
                        cursor: 'pointer',
                        padding: 0,
                        outline: 'none'
                      }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              )}
            </BlockStack>

            {/* Text Color */}
            <BlockStack gap="100">
              {renderColorField("Text color", textColor, setTextColor)}
              <button
                onClick={() => setShowTextPalette(!showTextPalette)}
                style={{
                  marginTop: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid var(--p-color-border-subdued)',
                  borderRadius: '4px',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--p-color-text)',
                  alignSelf: 'flex-start'
                }}
              >
                {showTextPalette ? 'Hide palette' : 'Show palette'}
              </button>
              {showTextPalette && (
                <div style={{
                  marginTop: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: '4px'
                }}>
                  {[
                    '#FFFFFF', '#F5F5F5', '#E0E0E0', '#BDBDBD', '#9E9E9E',
                    '#757575', '#616161', '#424242', '#212121', '#000000',
                    '#FFEBEE', '#FCE4EC', '#F3E5F5', '#E1BEE7', '#CE93D8',
                    '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2',
                    '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5',
                    '#2196F3', '#1E88E5', '#1976D2', '#1565C0', '#0D47A1',
                    '#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A',
                    '#4CAF50', '#43A047', '#388E3C', '#2E7D32', '#1B5E20',
                    '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726',
                    '#FF9800', '#FB8C00', '#F57C00', '#EF6C00', '#E65100',
                    '#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350',
                    '#F44336', '#E53935', '#D32F2F', '#C62828', '#B71C1C'
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => setTextColor(color)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: textColor === color ? '2px solid #000' : '1px solid var(--p-color-border-subdued)',
                        backgroundColor: color,
                        cursor: 'pointer',
                        padding: 0,
                        outline: 'none'
                      }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              )}
            </BlockStack>
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

  // Reset function to restore to initialSettings (last saved values)
  const resetToDefaults = useCallback(() => {
    setDisplayOnPage(initialSettings?.displayOnPage || "all");
    setExcludedPages(initialSettings?.excludedPages || "");
    setVerticalPosition(initialSettings?.verticalPosition || "top");
    setHorizontalPosition(initialSettings?.horizontalPosition || "left");
    setPositionSelect(initialSettings?.positionSelect || "today");
    setPositionValue(initialSettings?.positionValue || "today");
    setTopSelectValue(initialSettings?.topSelectValue || "");
    setLeftSelectValue(initialSettings?.leftSelectValue || "");
    setMessage(initialSettings?.message || "{NUMBER} people visited\nin last 30 minutes");
    setHidePopupThreshold(initialSettings?.hidePopupThreshold || "0");
    setPopupDuration(initialSettings?.popupDuration || "10");
    setDelayBeforeFirstPop(initialSettings?.delayBeforeFirstPop || "8");
    setShowCloseButton(initialSettings?.showCloseButton || false);
    setHideOnMobile(initialSettings?.hideOnMobile || false);
    setShape(initialSettings?.shape || "circle");
    setBorderRadius(initialSettings?.borderRadius || 8);
    setBackgroundColor(initialSettings?.backgroundColor || "#FFFFFF");
    setHighlightColor(initialSettings?.highlightColor || "#4E9611");
    setTextColor(initialSettings?.textColor || "#3F3F3F");
  }, [initialSettings]);

  // Expose reset function to parent
  useEffect(() => {
    if (onReset) {
      onReset.current = resetToDefaults;
    }
  }, [onReset, resetToDefaults]);

  // Track if this is the first render
  const isFirstRender = useRef(true);
  
  // Effect to emit settings changes - only when values actually change
  useEffect(() => {
    // Skip first render to avoid initial trigger
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    const currentSettings = {
      // Settings
      displayOnPage,
      excludedPages,
      verticalPosition,
      horizontalPosition,
      position: `${verticalPosition}-${horizontalPosition}`, // Keep for backward compatibility
      positionSelect,
      positionValue,
      topSelectValue,
      leftSelectValue,
      message,
      hidePopupThreshold,
      popupDuration,
      delayBeforeFirstPop,
      showCloseButton,
      hideOnMobile,
      // Styles
      shape,
      borderRadius,
      backgroundColor,
      highlightColor,
      textColor,
    };
    
    // Always call onSettingsChange when dependencies change
    onSettingsChange(currentSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    displayOnPage,
    excludedPages,
    verticalPosition,
    horizontalPosition,
    positionSelect,
    positionValue,
    topSelectValue,
    leftSelectValue,
    message,
    hidePopupThreshold,
    popupDuration,
    delayBeforeFirstPop,
    showCloseButton,
    hideOnMobile,
    shape,
    borderRadius,
    backgroundColor,
    highlightColor,
    textColor,
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

