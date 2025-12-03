import { Card, Text, BlockStack } from "@shopify/polaris";

export default function LowAlertPreview({ settings }) {
  const {
    customMessage = "Sold out! Check back soon",
    textColor = "#000000",
    fontSize = 14,
    fontFamily = "Arial, sans-serif",
    icon = "warning",
    alertPosition = "top-left",
    showCloseButton = false,
    animationEffect = "fade",
  } = settings || {};

  // Get icon component based on icon type
  const renderIcon = () => {
    const iconStyle = {
      width: '20px',
      height: '20px',
      color: '#d72c0d',
      display: 'inline-block',
    };

    switch (icon) {
      case 'warning':
      case 'alert':
      case 'exclamation':
        return (
          <span style={iconStyle}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '100%', height: '100%' }}>
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </span>
        );
      case 'info':
        return (
          <span style={iconStyle}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '100%', height: '100%' }}>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </span>
        );
      case 'bell':
        return (
          <span style={iconStyle}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '100%', height: '100%' }}>
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </span>
        );
      case 'check':
        return (
          <span style={iconStyle}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '100%', height: '100%' }}>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </span>
        );
      default:
        // Alarm clock icon (default)
        return (
          <span style={iconStyle}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '100%', height: '100%' }}>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </span>
        );
    }
  };

  // Calculate position styles based on alertPosition
  const getPositionStyles = () => {
    const positionStyles = {
      position: 'absolute',
    };

    // Parse alertPosition (e.g., "top-left", "top-right", "bottom-left", "bottom-right")
    const [vertical, horizontal] = alertPosition.split('-');

    // Set horizontal position
    if (horizontal === 'left') {
      positionStyles.left = '20px';
    } else {
      positionStyles.right = '20px';
    }

    // Set vertical position
    if (vertical === 'top') {
      positionStyles.top = '20px';
    } else {
      positionStyles.bottom = '20px';
    }

    return positionStyles;
  };

  // Process custom message to replace {stock} placeholder
  const processMessage = (message) => {
    if (!message) return "Sold out! Check back soon";
    // Replace {stock} with a sample stock number for preview
    return message.replace(/\{stock\}/gi, '5');
  };

  // Get animation class based on animationEffect
  const getAnimationStyle = () => {
    const animations = {
      fade: {
        animation: 'fadeIn 0.5s ease-in',
      },
      slide: {
        animation: 'slideIn 0.5s ease-out',
      },
      bounce: {
        animation: 'bounceIn 0.6s ease-out',
      },
      pulse: {
        animation: 'pulse 1s ease-in-out infinite',
      },
      zoom: {
        animation: 'zoomIn 0.4s ease-out',
      },
      none: {},
    };
    return animations[animationEffect] || animations.fade;
  };

  const sampleProduct = {
    title: 'The Collection Snowboard: Hydrogen',
    variant: 'Default',
    image: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
    quantity: 4,
  };

  const alertBaseStyles = {
    border: '2px dashed #e1e3e5',
    borderRadius: '12px',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '420px',
    width: 'fit-content',
    position: 'absolute',
    ...getPositionStyles(),
    ...getAnimationStyle(),
  };

  const quantityRowStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    color: '#2c6ecb',
    fontSize: `${Math.max(fontSize - 1, 12)}px`,
    fontWeight: 600,
    fontFamily: fontFamily,
  };

  const messageStyles = {
    fontWeight: 'bold',
    fontFamily: fontFamily,
    fontSize: `${fontSize}px`,
    color: textColor,
  };

  const quantityTextStyles = {
    fontSize: `${Math.max(fontSize - 2, 11)}px`,
    color: '#5c5f62',
    fontWeight: 'bold',
    fontFamily: fontFamily,
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Preview Section
        </Text>
        <div
          style={{
            height: '420px',
            backgroundColor: 'var(--p-color-bg-surface-secondary)',
            borderRadius: 'var(--p-border-radius-200)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            key={`alert-${animationEffect}-${icon}-${alertPosition}`}
            style={alertBaseStyles}
          >
            {showCloseButton && (
              <button
                aria-label="Close notification"
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
                  zIndex: 10,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                }}
              >
                ×
              </button>
            )}

            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <img
                src={sampleProduct.image}
                alt={sampleProduct.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                fontFamily,
                paddingRight: showCloseButton ? '32px' : '0',
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: `${Math.max(fontSize - 1, 12)}px`,
                  color: textColor,
                  lineHeight: 1.3,
                  fontFamily: fontFamily,
                }}
              >
                {sampleProduct.title}
              </span>

              <div style={quantityRowStyles}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {renderIcon()}
                </span>
                <span style={quantityTextStyles}>
                  {sampleProduct.quantity} in stock
                </span>
              </div>

              <span style={messageStyles}>
                {processMessage(customMessage)}
              </span>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideIn {
              from { transform: translateY(-20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes bounceIn {
              0% { transform: scale(0.3); opacity: 0; }
              50% { transform: scale(1.05); }
              70% { transform: scale(0.9); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            @keyframes zoomIn {
              from { transform: scale(0.5); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      </BlockStack>
    </Card>
  );
}
