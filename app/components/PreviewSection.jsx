import { Card, Text, BlockStack } from "@shopify/polaris";

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
    // Position properties
    xPosition,
    yPosition,
    xOffset,
    yOffset
  } = styles || {};

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

  return (
    <div style={{
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
      ':hover': {
        backgroundColor: hoverColor || '#ffffff'
      }
    }}>
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
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: `${textSize || 15}px`,
          fontWeight: textWeight || 'bold',
          color: textColor || '#000000',
          margin: 0,
          lineHeight: 1.4
        }}>
          Federico from Turin, Italy
        </div>
        <div style={{
          fontSize: `${linkSize || 15}px`,
          fontWeight: linkWeight || 'bold',
          color: linkColor || '#000000',
          textDecoration: 'none',
          cursor: 'pointer'
        }}>
          T-Shirt
        </div>
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