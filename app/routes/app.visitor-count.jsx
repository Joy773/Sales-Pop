import { json } from "@remix-run/node";
import { Page, Grid } from "@shopify/polaris";
import { VisitorsTabSection } from "../components/VisitorsTabSection";
import { VisitorCountPreview } from "../components/VisitorCountPreview";
import Savebar from "../components/Savebar";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getVisitorCountSettings } from "../visitorSettingsRepository.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const savedSettings = await getVisitorCountSettings(shop);
    
    return json({ 
      savedSettings: savedSettings || {}
    });
  } catch (error) {
    console.error('Error loading visitor count settings in loader:', error);
    return json({ savedSettings: {} });
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

export default function VisitorCount() {
  const { savedSettings } = useLoaderData();
  const [settings, setSettings] = useState(savedSettings || {});
  const [lastSavedSettings, setLastSavedSettings] = useState(savedSettings || {});
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const resetRef = useRef(null);
  const settingsInitializedRef = useRef(false);
  
  // Mark settings as initialized after first change from VisitorsTabSection
  const hasReceivedSettingsRef = useRef(false);
  
  useEffect(() => {
    if (Object.keys(settings).length > 0 && !hasReceivedSettingsRef.current) {
      hasReceivedSettingsRef.current = true;
      settingsInitializedRef.current = true;
    }
  }, [settings]);
  
  // Check if there are unsaved changes
  const isDirty = useMemo(() => {
    if (!settingsInitializedRef.current) return false;
    return !deepEqual(settings, lastSavedSettings);
  }, [settings, lastSavedSettings]);

  const handleSettingsChange = useCallback((newSettings) => {
    setSettings(prevSettings => {
      if (prevSettings === newSettings) return prevSettings;
      if (deepEqual(prevSettings, newSettings)) {
        return prevSettings;
      }
      return newSettings;
    });
  }, []);

  const handleSave = async () => {
    console.log('🔵 Visitor Count: handleSave called');
    console.log('🔵 Settings being saved:', settings);
    
    try {
      const response = await fetch('/api/visitor-count/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      console.log('🔵 Response status:', response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('❌ HTTP error response:', errorData);
        const errorMsg = errorData.error || errorData.details || `HTTP ${response.status}`;
        setNotificationMessage(`Error: ${errorMsg}`);
        setShowNotification(true);
        setTimeout(() => {
          setShowNotification(false);
        }, 5000);
        return;
      }
      
      const data = await response.json();
      console.log('🔵 Response data:', data);

      if (data.success) {
        console.log('✅ Success! Setting notification...');
        setLastSavedSettings(settings);
        setNotificationMessage('Saved!');
        setShowNotification(true);
        
        setTimeout(() => {
          setShowNotification(false);
        }, 3000);
      } else {
        console.error('❌ API returned success: false');
        const errorMsg = data.error || data.details || data.message || 'Unknown error';
        setNotificationMessage(`Error saving: ${errorMsg}`);
        setShowNotification(true);
        
        setTimeout(() => {
          setShowNotification(false);
        }, 7000);
      }
    } catch (error) {
      console.error('❌ Exception in handleSave:', error);
      const errorMsg = error.message || 'Network error or server unavailable';
      setNotificationMessage(`Error: ${errorMsg}`);
      setShowNotification(true);
      
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
    }
  };

  const handleDiscard = () => {
    console.log('🟡 Visitor Count: handleDiscard called');
    setSettings(lastSavedSettings);
    if (resetRef.current) {
      resetRef.current();
    }
    
    setNotificationMessage('Discarded!');
    setShowNotification(true);
    
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
        title="Visitor Count"
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
              <VisitorCountPreview settings={settings} />
            </div>
          </Grid.Cell>

          {/* Settings and Styles Tabs - Right Side (40%) */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <VisitorsTabSection 
              onSettingsChange={handleSettingsChange} 
              onReset={resetRef} 
              initialSettings={lastSavedSettings}
            />
          </Grid.Cell>
        </Grid>
      </div>
    </Page>
    </>
  );
}

