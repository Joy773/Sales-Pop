import { json } from "@remix-run/node";
import { Page, Grid } from "@shopify/polaris";
import { PreviewSection } from "../components/PreviewSection";
import { TabsSection } from "../components/TabsSection";
import Savebar from "../components/Savebar";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getSalesPopStyles } from "../stylesRepository.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const savedStyles = await getSalesPopStyles(shop);
    
    // Check if we have orders in MongoDB
    const { getRecentOrders } = await import('../ordersRepository.server');
    const recentOrders = await getRecentOrders(shop);
    const hasOrders = recentOrders && recentOrders.length > 0;
    
    return json({ 
      savedStyles: savedStyles || {},
      hasOrders: hasOrders,
      orderCount: recentOrders?.length || 0
    });
  } catch (error) {
    console.error('Error loading styles in loader:', error);
    return json({ savedStyles: {}, hasOrders: false, orderCount: 0 });
  }
};

// Helper function to deep compare objects
function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

export default function SalesPop() {
  const { savedStyles } = useLoaderData();
  const [styles, setStyles] = useState(savedStyles || {});
  const [lastSavedStyles, setLastSavedStyles] = useState(savedStyles || {});
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const resetRef = useRef(null);
  const stylesInitializedRef = useRef(false);
  const fetcher = useFetcher();
  
  // Mark styles as initialized after first change from TabsSection
  // Use a ref to track if we've received styles from TabsSection
  const hasReceivedStylesRef = useRef(false);
  
  useEffect(() => {
    if (Object.keys(styles).length > 0 && !hasReceivedStylesRef.current) {
      hasReceivedStylesRef.current = true;
      stylesInitializedRef.current = true;
    }
  }, [styles]);
  
  // Check if there are unsaved changes
  // Only check after styles have been initialized by TabsSection
  // Memoize isDirty to prevent recalculation on every render
  const isDirty = useMemo(() => {
    if (!stylesInitializedRef.current) return false;
    return !deepEqual(styles, lastSavedStyles);
  }, [styles, lastSavedStyles]);

  const handleStylesChange = useCallback((newStyles) => {
    // Use functional update to avoid stale closure issues
    setStyles(prevStyles => {
      // Quick reference check first
      if (prevStyles === newStyles) return prevStyles;
      
      // Deep equality check
      if (deepEqual(prevStyles, newStyles)) {
        return prevStyles; // Return same reference if equal
      }
      return newStyles;
    });
  }, []);

  // Handle fetcher state changes
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;
      console.log('🔵 Fetcher completed, response data:', data);
      
      if (data.success) {
        console.log('✅ Success! Setting notification...');
        
        // Update lastSavedStyles so isDirty becomes false
        setLastSavedStyles(styles);
        
        // Check if order-related settings changed
        const orderSettingsChanged = 
          styles.selectedOrderType !== lastSavedStyles.selectedOrderType ||
          styles.lookbackDays !== lastSavedStyles.lookbackDays;
        
        // If order settings changed, fetch orders from Shopify
        if (orderSettingsChanged) {
          console.log('🔄 Order settings changed, fetching orders from Shopify...');
          fetch('/api/orders')
            .then(ordersResponse => ordersResponse.json())
            .then(ordersData => {
              if (ordersData.success) {
                console.log(`✅ Successfully fetched ${ordersData.count || 0} orders from Shopify`);
                setNotificationMessage(`Saved! Fetched ${ordersData.count || 0} orders.`);
              } else {
                console.warn('⚠️ Failed to fetch orders:', ordersData.error);
                setNotificationMessage('Saved! (Failed to fetch orders)');
              }
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 3000);
            })
            .catch(ordersError => {
              console.error('❌ Error fetching orders:', ordersError);
              setNotificationMessage('Saved! (Error fetching orders)');
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 3000);
            });
        } else {
          setNotificationMessage('Saved!');
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 3000);
        }
      } else {
        console.error('❌ API returned success: false');
        const errorMsg = data.error || data.details || data.message || 'Unknown error';
        console.error('Save error:', errorMsg);
        setNotificationMessage(`Error saving: ${errorMsg}`);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 7000);
      }
    }
    
    if (fetcher.state === 'submitting') {
      console.log('🔵 Fetcher submitting...');
    }
    
    if (fetcher.state === 'loading') {
      console.log('🔵 Fetcher loading...');
    }
  }, [fetcher.state, fetcher.data, styles, lastSavedStyles]);

  const handleSave = async () => {
    console.log('🔵 handleSave called');
    console.log('🔵 Styles being saved:', styles);
    console.log('🔵 Styles object keys:', Object.keys(styles));
    console.log('🔵 Styles object size:', JSON.stringify(styles).length, 'bytes');
    console.log('🔵 Styles is empty?', Object.keys(styles).length === 0);
    
    // Validate styles object before sending
    if (!styles || typeof styles !== 'object' || Object.keys(styles).length === 0) {
      console.error('❌ Cannot save: styles object is empty or invalid');
      setNotificationMessage('Error: No styles to save. Please configure your settings first.');
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      return;
    }
    
    try {
      console.log('🔵 Using Remix fetcher to submit to /api/styles');
      
      // Try using FormData first (works better with Remix fetcher)
      const formData = new FormData();
      formData.append('styles', JSON.stringify(styles));
      
      console.log('🔵 Submitting FormData with styles:', {
        stylesKeys: Object.keys(styles),
        stylesStringLength: JSON.stringify(styles).length
      });
      
      fetcher.submit(formData, {
        method: 'POST',
        action: '/api/styles',
      });
      
      console.log('🔵 Fetcher submit called, fetcher state:', fetcher.state);
    } catch (error) {
      console.error('❌ Error in handleSave:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 300)
      });
      setNotificationMessage(`Error: ${error.message || 'Failed to save'}`);
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
    }
  };

  const handleDiscard = () => {
    console.log('🟡 handleDiscard called');
    // Reset all settings to last saved values
    setStyles(lastSavedStyles);
    if (resetRef.current) {
      resetRef.current();
    }
    
    setNotificationMessage('Discarded!');
    setShowNotification(true);
    
    // ContextualSaveBar will automatically hide after discard
    
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  return (
    <>
      <Savebar onSave={handleSave} onDiscard={handleDiscard} isDirty={isDirty} />
      
      {/* Notification */}
      {showNotification && (
        <div
          id="save-notification-debug"
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#2e7d32',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15), 0px 2px 4px rgba(0, 0, 0, 0.1)',
            zIndex: 99999,
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '200px',
            maxWidth: '400px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            lineHeight: '1.5'
          }}
        >
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span>{notificationMessage}</span>
        </div>
      )}
      
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
            <TabsSection 
              onStylesChange={handleStylesChange} 
              onReset={resetRef} 
              initialStyles={lastSavedStyles}
            />
          </Grid.Cell>
        </Grid>
      </div>
    </Page>
    </>
  );
} 