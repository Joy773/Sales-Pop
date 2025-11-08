import { Card, Text, BlockStack } from "@shopify/polaris";

function VisitorCountWidget({ settings }) {
  const {
    shape = "circle",
    borderRadius = 8,
    backgroundColor = "#ffffff",
    highlightColor = "#4CAF50",
    textColor = "#555555",
    showCloseButton = false,
    message = "{NUMBER} people visited\nin last 30 minutes",
  } = settings || {};
  
  // Mock visitor count
  const visitorCount = 68;
  
  // Parse message to replace {NUMBER} and {TIME} placeholders
  const displayMessage = message
    .replace(/{NUMBER}/g, visitorCount.toString())
    .replace(/{TIME}/g, "30 minutes");
  
  const messageLines = displayMessage.split('\n');

  // Calculate border radius based on shape
  const getBorderRadius = () => {
    if (shape === 'circle') {
      return '50px'; // Fully rounded for circle
    } else if (shape === 'square') {
      return '0px'; // No rounding for square
    } else if (shape === 'rounded') {
      return `${borderRadius}px`; // Use the borderRadius value for rounded
    }
    return `${borderRadius}px`; // Default fallback
  };

  const widgetStyle = {
    position: 'relative',
    backgroundColor: backgroundColor,
    borderRadius: getBorderRadius(),
    padding: '12px 16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    border: 'none',
    maxWidth: '400px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  return (
    <>
      <style>{`
        @keyframes glow-pulse {
          0%, 100% {
            opacity: 0.2;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
        @keyframes glow-pulse-middle {
          0%, 100% {
            opacity: 0.4;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.7;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }
        @keyframes glow-pulse-inner {
          0%, 100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
        .glow-outer {
          animation: glow-pulse 2s ease-in-out infinite;
        }
        .glow-middle {
          animation: glow-pulse-middle 2s ease-in-out infinite;
        }
        .glow-inner {
          animation: glow-pulse-inner 2s ease-in-out infinite;
        }
      `}</style>
      <div style={widgetStyle}>
        {/* Green concentric circle icon */}
        <div style={{
          width: '24px',
          height: '24px',
          position: 'relative',
          flexShrink: 0
        }}>
          {/* Outermost ring - very light green */}
          <div className="glow-outer" style={{
            position: 'absolute',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: '2px solid rgba(76, 175, 80, 0.2)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }} />
          {/* Middle ring - light green */}
          <div className="glow-middle" style={{
            position: 'absolute',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: '2px solid rgba(76, 175, 80, 0.4)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }} />
          {/* Innermost circle - solid green */}
          <div className="glow-inner" style={{
            position: 'absolute',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#4CAF50',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }} />
        </div>
      
      {/* Text content */}
      <div style={{ 
        flex: 1,
        paddingRight: showCloseButton ? '32px' : '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0px'
      }}>
        <div style={{
          color: highlightColor || '#4CAF50',
          fontSize: '15px',
          fontWeight: 'bold',
          lineHeight: '1.4'
        }}>
          {messageLines[0] || `${visitorCount} people visited`}
        </div>
        <div style={{
          color: textColor || '#555555',
          fontSize: '13px',
          fontWeight: 'normal',
          lineHeight: '1.4'
        }}>
          {messageLines[1] || 'in last 30 minutes'}
        </div>
      </div>

      {showCloseButton && (
        <button
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '20px',
            height: '20px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: '1',
            color: '#666',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Close"
        >
          ×
        </button>
      )}
      </div>
    </>
  );
}

export function VisitorCountPreview({ settings }) {
  const { positionValue = 'top left', topSelectValue = '', leftSelectValue = '' } = settings || {};
  
  // Parse position value to get vertical and horizontal positions
  const positionParts = (positionValue || 'top left').split(' ');
  const verticalPos = positionParts[0] || 'top';
  const horizontalPos = positionParts[1] || 'left';
  
  // Calculate positioning styles
  const getPositionStyles = () => {
    const styles = {
      position: 'absolute',
    };
    
    // Vertical positioning
    if (verticalPos === 'top') {
      styles.top = topSelectValue ? `${topSelectValue}px` : '20px';
      styles.bottom = 'auto';
    } else {
      styles.bottom = topSelectValue ? `${topSelectValue}px` : '20px';
      styles.top = 'auto';
    }
    
    // Horizontal positioning
    if (horizontalPos === 'left') {
      styles.left = leftSelectValue ? `${leftSelectValue}px` : '20px';
      styles.right = 'auto';
    } else {
      styles.right = leftSelectValue ? `${leftSelectValue}px` : '20px';
      styles.left = 'auto';
    }
    
    return styles;
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">Preview</Text>
        <Text as="p" variant="bodyMd" color="subdued">
          This is how your visitor count widget will appear on the storefront.
        </Text>
        
        <div style={{
          minHeight: '200px',
          padding: '40px',
          backgroundColor: '#f6f6f7',
          borderRadius: '8px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={getPositionStyles()}>
            <VisitorCountWidget settings={settings} />
          </div>
        </div>
        
        <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
          <Text as="p" variant="bodySm" color="subdued">
            <strong>Note:</strong> This is a preview. The actual visitor count will show real-time data from your store.
          </Text>
        </div>
      </BlockStack>
    </Card>
  );
}

