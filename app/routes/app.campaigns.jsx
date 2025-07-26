import { Page, Layout, Grid, Text } from "@shopify/polaris";
import { CampaignCard } from "../components/CampaignCard";
import { useNavigate } from "@remix-run/react";

const CAMPAIGNS = [
  {
    type: "Sales Pop",
    title: "Sales pop- Social Proof",
    subtitle: "Show recently purchased orders to build trust and FOMO (fear of missing out).",
    image: null,
    link: "/app/sales-pop"
  },
  {
    type: "Visitors Count",
    title: "Visitor Count- Social Proof",
    subtitle: "Display the number of visitors at a specific time to show how popular your store is.",
    image: null,
    link: "/app/visitor-count"
  },
  {
    type: "Order Count",
    title: "Sold Count- Social Proof",
    subtitle: "Show the number of successful orders to encourage customers to purchase.",
    image: null,
    link: "/app/order-count"
  },
  {
    type: "Custom Popup",
    title: "Popup- Popup",
    subtitle: "Create coupon or newsletter popup to interact with your customer",
    image: null,
    link: "/app/custom-popup"
  },
  {
    type: "Last Sale",
    title: "Last Sale- Product Specific",
    subtitle: "Display recent sales of specific products to boost customer confidence.",
    image: null,
    link: "/app/last-sale"
  },
  {
    type: "Low Stock",
    title: "Low Stock Alert",
    subtitle: "Show stock levels to create urgency and encourage quick purchases.",
    image: null,
    link: "/app/low-stock"
  }
];

export default function Campaigns() {
  const navigate = useNavigate();

  const handleCreateClick = (link) => {
    navigate(link);
  };

  return (
    <Page
      title="Campaigns"
      divider
    >
      <Layout>
        <Layout.Section>
          <Grid gap="400">
            {CAMPAIGNS.map((campaign, index) => (
              <Grid.Cell key={index} columnSpan={{ xs: 6, sm: 3, md: 4, lg: 4 }}>
                <CampaignCard {...campaign} onCreateClick={() => handleCreateClick(campaign.link)} />
              </Grid.Cell>
            ))}
          </Grid>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 