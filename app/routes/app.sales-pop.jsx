import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Grid } from "@shopify/polaris";
import { PreviewSection } from "../components/PreviewSection";
import { TabsSection } from "../components/TabsSection";
import { useState } from "react";

export const loader = async ({ request }) => {
  return json({});
};

export default function SalesPop() {
  const [styles, setStyles] = useState({});

  const handleStylesChange = (newStyles) => {
    setStyles(newStyles);
  };

  return (
    <Page
      divider
      fullWidth
    >
      <div style={{maxWidth:'1200px', margin:'0 auto'}}>
        <Grid>
          {/* Preview Section - Left Side (60%) */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 8, lg: 8, xl: 8 }}>
            <div style={{
              position: 'sticky',
              top: '20px',
              height: 'fit-content'
            }}>
              <PreviewSection styles={styles} />
            </div>
          </Grid.Cell>

          {/* Settings and Styles Tabs - Right Side (40%) */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <TabsSection onStylesChange={handleStylesChange} />
          </Grid.Cell>
        </Grid>
      </div>
    </Page>
  );
} 