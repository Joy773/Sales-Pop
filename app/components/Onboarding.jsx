import { useState } from "react";
import { Card, Button, Icon, Text, BlockStack, InlineStack, Box } from "@shopify/polaris";
import { CursorFilledIcon } from "@shopify/polaris-icons";
import onboardingAppEmbed from "../assets/onboarding-app-embed.png";

export function Onboarding({ onSkip }) {
  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "0 20px" }}>
      <Card padding="500">
        <div style={{ display: "flex" }}>
          {/* Left section - 45% */}
          <div style={{ 
            width: "45%", 
            backgroundColor: "var(--p-color-bg-surface-secondary)",
            borderRadius: "var(--p-border-radius-200)",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <img 
              src={onboardingAppEmbed} 
              alt="App embed demonstration" 
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>

          {/* Right section - 55% */}
          <div style={{ width: "55%", paddingLeft: "24px" }}>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Welcome!
              </Text>
              <Text as="p" variant="bodyMd" color="subdued">
                Let's start your first step with Qikify Sales Pop-up 👋
              </Text>
              <Text as="p" variant="bodyMd" color="subdued">
                In order to make the campaigns created by our app visible on your storefront, app embed is required.
              </Text>
              <Button 
                variant="primary"
                icon={CursorFilledIcon}
                onClick={() => {}}
              >
                Enable theme app extension
              </Button>
              <Text as="p" variant="bodyMd" color="subdued">
                The button below to open theme editor with app embed enabled. Click Save button in that window and then go back here to continue.
              </Text>
              <InlineStack align="end" gap="300">
                <Button onClick={onSkip}>Skip</Button>
                <Button variant="primary" onClick={() => {}}>Next step</Button>
              </InlineStack>
            </BlockStack>
          </div>
        </div>
      </Card>
    </div>
  );
} 