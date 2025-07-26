import { Card, Text, Button, BlockStack } from "@shopify/polaris";

export function CampaignCard({ title, subtitle, image, type, onCreateClick }) {
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
          <Button variant="primary" fullWidth onClick={onCreateClick}>Create</Button>
        </div>
      </BlockStack>
    </Card>
  );
} 