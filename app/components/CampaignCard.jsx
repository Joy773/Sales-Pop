import { Card, Text, Button, BlockStack, InlineStack } from "@shopify/polaris";
import { Link } from "@remix-run/react";
import { useState, useEffect } from "react";

// Custom Toggle Switch Component
function ToggleSwitch({ checked, onChange }) {
  return (
    <label
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '44px',
        height: '24px',
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          opacity: 0,
          width: 0,
          height: 0,
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: checked ? '#008060' : '#c9cccf',
          borderRadius: '12px',
          transition: 'background-color 0.2s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            content: '""',
            height: '20px',
            width: '20px',
            left: checked ? '22px' : '2px',
            bottom: '2px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            transition: 'left 0.2s',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          }}
        />
      </span>
    </label>
  );
}

export function CampaignCard({ title, subtitle, image, type, link, onCreateClick, isCreated = false, isEnabled = false, onToggleChange, campaignKey }) {
  // Use local state for optimistic updates
  const [localEnabled, setLocalEnabled] = useState(isEnabled);

  // Sync local state when prop changes (e.g., after server response)
  useEffect(() => {
    setLocalEnabled(isEnabled);
  }, [isEnabled]);

  const handleToggleChange = (checked) => {
    // Update local state immediately for instant UI feedback
    setLocalEnabled(checked);
    
    // Then notify parent to sync with server
    if (onToggleChange && campaignKey) {
      onToggleChange(campaignKey, checked);
    }
  };

  return (
    <Card>
      <div style={{ height: "180px", backgroundColor: "var(--p-color-bg-surface-secondary)", position: "relative", marginBottom:'10px' }}>
        {image ? (
          <img 
            src={image} 
            alt={title}
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "cover" 
            }}
          />
        ) : (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center"
          }}>
            <Text as="h3" variant="headingMd">{type}</Text>
          </div>
        )}
      </div>
      <BlockStack gap="300" padding="400">
        <Text as="h2" variant="headingMd">{title}</Text>
        <Text as="p" variant="bodyMd" color="subdued">{subtitle}</Text>
        <div style={{ marginTop: "8px" }}>
          {isCreated ? (
            <InlineStack gap="300" align="space-between">
              {link ? (
                <Link to={link} style={{ textDecoration: 'none', flex: 1 }}>
                  <Button 
                    variant="secondary" 
                    fullWidth
                  >
                    Edit
                  </Button>
                </Link>
              ) : (
                <Button 
                  variant="secondary" 
                  fullWidth
                  onClick={onCreateClick}
                >
                  Edit
                </Button>
              )}
              <ToggleSwitch
                checked={localEnabled}
                onChange={handleToggleChange}
              />
            </InlineStack>
          ) : (
            link ? (
              <Link to={link} style={{ textDecoration: 'none', display: 'block' }}>
                <Button 
                  variant="primary" 
                  fullWidth
                >
                  Create
                </Button>
              </Link>
            ) : (
              <Button 
                variant="primary" 
                fullWidth 
                onClick={onCreateClick}
              >
                Create
              </Button>
            )
          )}
        </div>
      </BlockStack>
    </Card>
  );
} 