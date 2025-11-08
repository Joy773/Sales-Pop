import { Card, Text, BlockStack } from "@shopify/polaris";

import React from 'react';

// Sample data for preview
const SAMPLE_DATA = {
  CUSTOMER: 'Federico',
  LOCATION: 'Turin, Italy',
  PRODUCT: 'T-Shirt'
};

function NotificationCard({ styles }) {
  const {
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
    messageTemplate,
    // Position properties
    xPosition,
    yPosition,
    xOffset,
    yOffset,
    hideOnMobile, // NEW
    showCloseButton,
  } = styles || {};

  // Parse message template and split into text and product parts
  const parseMessageTemplate = () => {
    const template = messageTemplate || "{CUSTOMER} from {LOCATION} bought {PRODUCT}";
    
    // Find PRODUCT placeholder position
    const productIndex = template.indexOf('{PRODUCT}');
    
    if (productIndex === -1) {
      // No PRODUCT placeholder, render all as text
      let textContent = template;
      textContent = textContent.replace(/\{CUSTOMER\}/g, SAMPLE_DATA.CUSTOMER);
      textContent = textContent.replace(/\{LOCATION\}/g, SAMPLE_DATA.LOCATION);
      return { textContent, productContent: null };
    }
    
    // Split into parts before and after PRODUCT
    const beforeProduct = template.substring(0, productIndex);
    const afterProduct = template.substring(productIndex + '{PRODUCT}'.length);
    
    // Replace CUSTOMER and LOCATION placeholders in the before part
    let textContent = beforeProduct;
    textContent = textContent.replace(/\{CUSTOMER\}/g, SAMPLE_DATA.CUSTOMER);
    textContent = textContent.replace(/\{LOCATION\}/g, SAMPLE_DATA.LOCATION);
    
    // Replace any placeholders in after part (if any)
    let afterText = afterProduct;
    afterText = afterText.replace(/\{CUSTOMER\}/g, SAMPLE_DATA.CUSTOMER);
    afterText = afterText.replace(/\{LOCATION\}/g, SAMPLE_DATA.LOCATION);
    
    // Combine text content
    const fullTextContent = (textContent + afterText).trim();
    
    return {
      textContent: fullTextContent,
      productContent: SAMPLE_DATA.PRODUCT
    };
  };

  const { textContent, productContent } = parseMessageTemplate();

  // Calculate position styles
  const getPositionStyles = () => {
    const positionStyles = {
      position: 'absolute'
    };

    // Set horizontal position
    if (xPosition === 'left') {
      positionStyles.left = `${xOffset || 20}px`;
    } else {
      positionStyles.right = `${xOffset || 20}px`;
    }

    // Set vertical position
    if (yPosition === 'top') {
      positionStyles.top = `${yOffset || 20}px`;
    } else {
      positionStyles.bottom = `${yOffset || 20}px`;
    }

    return positionStyles;
  };

  // Add CSS for hiding on mobile
  const hideMobileStyle = hideOnMobile
    ? {
        display: "none",
      }
    : {};

  return (
    <div
      style={{
        ...getPositionStyles(),
        backgroundColor: useBackgroundImage ? 'transparent' : (backgroundColor || '#fff8e6'),
        backgroundImage: useBackgroundImage ? `url(${backgroundImageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: `${borderWidth || 1}px solid ${borderColor || '#e1e3e5'}`,
        borderRadius: `${borderRadius || 8}px`,
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '400px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        ...hideMobileStyle,
      }}
    >
      {/* Close Button */}
      {showCloseButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            // In preview, we could hide the notification or just log
            console.log('Close button clicked');
          }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            color: '#000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            lineHeight: '1',
            padding: 0,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
          }}
          aria-label="Close notification"
        >
          ×
        </button>
      )}

      {/* Product Image */}
      <div style={{
        width: `${imageSize || 48}px`,
        height: `${imageSize || 48}px`,
        borderRadius: `${imageRadius || 8}px`,
        overflow: 'hidden',
        flexShrink: 0
      }}>
        <img 
          src="https://burst.shopifycdn.com/photos/green-t-shirt.jpg"
          alt="Product"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1,
        paddingRight: showCloseButton ? '32px' : '0'
      }}>
        {/* Message text (customer, location, etc.) */}
        {textContent && (
          <div style={{
            fontSize: `${textSize || 15}px`,
            fontWeight: textWeight || 'bold',
            color: textColor || '#000000',
            margin: 0,
            lineHeight: 1.4
          }}>
            {textContent}
          </div>
        )}
        {/* Product link */}
        {productContent && (
          <div style={{
            fontSize: `${linkSize || 15}px`,
            fontWeight: linkWeight || 'bold',
            color: linkColor || '#000000',
            textDecoration: 'none',
            cursor: 'pointer',
            marginTop: textContent ? '4px' : 0
          }}>
            {productContent}
          </div>
        )}
        <Text
          as="p"
          variant="bodySm"
          color="subdued"
          style={{ marginTop: '4px' }}
        >
          just now
        </Text>
      </div>
    </div>
  );
}

export function PreviewSection({ styles }) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">Preview Section</Text>
        <div style={{ 
          height: "500px", 
          backgroundColor: "var(--p-color-bg-surface-secondary)",
          borderRadius: "var(--p-border-radius-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          position: "relative",
          overflow: "hidden"
        }}>
          <NotificationCard styles={styles} />
        </div>
      </BlockStack>
    </Card>
  );
} 