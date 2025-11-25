/**
 * Sales Pop Notification - Storefront Script
 * Fetches configuration and displays sales notifications on the storefront
 */

/* global Shopify */
(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // Get app URL from script source or use default
    getAppUrl: function() {
      // Try from window variable first (set by liquid file)
      if (window.SalesPopAppUrl) {
        console.log('Sales Pop: Using app URL from window.SalesPopAppUrl:', window.SalesPopAppUrl);
        return window.SalesPopAppUrl;
      }
      
      // Try from meta tag
      const appUrlMeta = document.querySelector('meta[name="salespop-app-url"]');
      if (appUrlMeta && appUrlMeta.content) {
        console.log('Sales Pop: Using app URL from meta tag:', appUrlMeta.content);
        return appUrlMeta.content;
      }
      
      // Try to get from script src (for app-hosted scripts)
      const scripts = document.querySelectorAll('script[src*="salespop.js"]');
      if (scripts.length > 0) {
        const src = scripts[0].src;
        const extensionsIndex = src.indexOf('/extensions/');
        if (extensionsIndex !== -1) {
          const appUrl = src.substring(0, extensionsIndex);
          console.log('Sales Pop: Extracted app URL from script src:', appUrl);
          return appUrl;
        }
        console.warn('Sales Pop: Script loaded from CDN, cannot extract app URL from script src');
      }
      
      // Fallback: try to detect from common development domains
      const hostname = window.location.hostname;
      if (hostname.includes('ngrok.io') || hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('cloudflare.com') || hostname.includes('trycloudflare.com')) {
        const appUrl = `${window.location.protocol}//${window.location.host}`;
        console.log('Sales Pop: Using current location as app URL (dev mode):', appUrl);
        return appUrl;
      }
      
      console.error('Sales Pop: Could not determine app URL. Please set window.SalesPopAppUrl in your theme extension.');
      return null;
    },
    // Combined API endpoint for fetching both styles and notifications
    // Uses App Proxy if available (more secure, bypasses PCD), otherwise falls back to public API
    getCombinedApiUrl: function(shop) {
      // Try App Proxy first (Shopify-verified, no shop parameter needed)
      // App Proxy URL format: https://store.myshopify.com/apps/sales-pop/data
      // Shopify automatically adds shop, signature, timestamp, and path_prefix parameters
      const shopDomain = shop || window.location.hostname;
      if (shopDomain && shopDomain.includes('.myshopify.com')) {
        const proxyUrl = `https://${shopDomain}/apps/sales-pop/data`;
        console.log('Sales Pop: Using App Proxy URL:', proxyUrl);
        return proxyUrl;
      }
      
      // Fallback to public API endpoint
      const appUrl = this.getAppUrl();
      if (!appUrl || appUrl === 'https://your-app-url.com') {
        console.error('Sales Pop: Invalid app URL detected:', appUrl);
        console.error('Sales Pop: Please update the app URL in orderspop.liquid file');
        return null;
      }
      const apiUrl = `${appUrl}/api/public/salespop?shop=${encodeURIComponent(shop)}`;
      console.log('Sales Pop: Using public API URL (fallback):', apiUrl);
      return apiUrl;
    },
    // Legacy: API endpoint for fetching styles only (kept for backward compatibility)
    // Uses App Proxy if available, otherwise falls back to public API
    getApiUrl: function(shop) {
      // Try App Proxy first
      const shopDomain = shop || window.location.hostname;
      if (shopDomain && shopDomain.includes('.myshopify.com')) {
        const proxyUrl = `https://${shopDomain}/apps/sales-pop/styles`;
        console.log('Sales Pop: Using App Proxy URL for styles:', proxyUrl);
        return proxyUrl;
      }
      
      // Fallback to public API
      const appUrl = this.getAppUrl();
      return `${appUrl}/api/styles/public?shop=${encodeURIComponent(shop)}`;
    },
    defaultStyles: {
      backgroundColor: '#fff8e6',
      borderColor: '#e1e3e5',
      borderWidth: 1,
      borderRadius: 8,
      textSize: 15,
      textWeight: 'bold',
      textColor: '#000000',
      linkSize: 15,
      linkWeight: 'bold',
      linkColor: '#000000',
      imageSize: 48,
      imageRadius: 8,
      xPosition: 'right',
      yPosition: 'bottom',
      xOffset: '20',
      yOffset: '20',
      hideOnMobile: false,
      showCloseButton: false,
      popupInterval: 1,
      popupDuration: 10,
      messageTemplate: '{CUSTOMER} from {LOCATION} bought {PRODUCT}'
    }
  };

  // Get shop domain from current page
  function getShopDomain() {
    let shop = null;
    
    // Try window variable first (most reliable)
    if (window.SalesPopShop) {
      shop = window.SalesPopShop;
      console.log('Sales Pop: Got shop from window.SalesPopShop:', shop);
    } else {
      // Try from meta tag
      const shopMeta = document.querySelector('meta[name="shop"]');
      if (shopMeta) {
        shop = shopMeta.content;
        console.log('Sales Pop: Got shop from meta tag:', shop);
      } else {
        // Fallback: extract from hostname
        const hostname = window.location.hostname;
        if (hostname.includes('.myshopify.com')) {
          shop = hostname;
          console.log('Sales Pop: Got shop from hostname:', shop);
        } else {
          // Legacy: Try Shopify global object
          if (typeof Shopify !== 'undefined' && Shopify.shop) {
            shop = Shopify.shop;
            console.log('Sales Pop: Got shop from Shopify.shop:', shop);
          }
        }
      }
    }
    
    // Normalize shop domain to lowercase (to match how it's stored in MongoDB)
    if (shop) {
      const normalizedShop = shop.trim().toLowerCase();
      if (normalizedShop !== shop) {
        console.log('Sales Pop: Normalized shop domain:', shop, '->', normalizedShop);
      }
      return normalizedShop;
    }
    
    console.warn('Sales Pop: Could not determine shop domain');
    return null;
  }

  // Fetch configuration from API
  async function fetchConfiguration() {
    const shop = getShopDomain();
    console.log('Sales Pop: Shop domain from getShopDomain =', shop);
    
    if (!shop) {
      console.warn('Sales Pop: Could not determine shop domain, using defaults');
      return CONFIG.defaultStyles;
    }

    try {
      const apiUrl = CONFIG.getApiUrl(shop);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.styles) {
        return { ...CONFIG.defaultStyles, ...data.styles };
      }
      
      return CONFIG.defaultStyles;
    } catch (error) {
      console.warn('Sales Pop: Failed to fetch configuration, using defaults:', error);
      return CONFIG.defaultStyles;
    }
  }

  // Fetch both styles and notification from combined API
  async function fetchCombinedData(shop) {
    console.log('Sales Pop: fetchCombinedData called with shop:', shop);
    
    if (!shop) {
      console.warn('Sales Pop: Could not determine shop domain');
      return {
        styles: CONFIG.defaultStyles,
        notification: {
          customer: 'Sarah',
          location: 'New York, USA',
          product: 'Classic T-Shirt',
          productImage: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
          productUrl: '#',
          time: 'just now'
        }
      };
    }

    const appUrl = CONFIG.getAppUrl();
    if (!appUrl) {
      console.warn('Sales Pop: No app URL available, using fallback data');
      return {
        styles: CONFIG.defaultStyles,
        notification: {
          customer: 'Sarah',
          location: 'New York, USA',
          product: 'Classic T-Shirt',
          productImage: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
          productUrl: '#',
          time: 'just now'
        }
      };
    }

    // Try App Proxy first, then fallback to public API
    const shopDomain = shop || window.location.hostname;
    const useAppProxy = shopDomain && shopDomain.includes('.myshopify.com');
    let apiUrl = null;
    
    if (useAppProxy) {
      try {
        apiUrl = `https://${shopDomain}/apps/sales-pop/data`;
        console.log('Sales Pop: Trying App Proxy URL:', apiUrl);
        console.log('Sales Pop: Shop parameter:', shop);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-cache'
        });

        if (response.ok) {
          const responseText = await response.text();
          
          if (!responseText || responseText.trim().length === 0) {
            throw new Error('Empty response from App Proxy');
          }

          const data = JSON.parse(responseText);
          
          // Check if campaign is disabled
          if (data.enabled === false) {
            console.log('Sales Pop: Campaign is disabled (App Proxy)');
            return null;
          }
          
          if (data.success) {
            console.log('Sales Pop: ✓ Success from App Proxy');
            console.log('Sales Pop: App Proxy styles received:', {
              hasStyles: !!data.styles,
              styleCount: data.styles ? Object.keys(data.styles).length : 0,
              styleKeys: data.styles ? Object.keys(data.styles).slice(0, 10) : [],
              sampleStyles: data.styles ? {
                backgroundColor: data.styles.backgroundColor,
                textColor: data.styles.textColor,
                messageTemplate: data.styles.messageTemplate
              } : null
            });
            
            // Merge with defaults - ensure we always have valid styles
            const mergedStyles = { ...CONFIG.defaultStyles, ...(data.styles || {}) };
            console.log('Sales Pop: Merged styles (App Proxy):', {
              styleCount: Object.keys(mergedStyles).length,
              backgroundColor: mergedStyles.backgroundColor,
              textColor: mergedStyles.textColor,
              messageTemplate: mergedStyles.messageTemplate
            });
            
            // Log notification data received from App Proxy
            console.log('Sales Pop: App Proxy notification received:', {
              customer: data.notification?.customer,
              product: data.notification?.product,
              location: data.notification?.location,
              time: data.notification?.time,
              productUrl: data.notification?.productUrl,
              isMockData: data.notification?.customer === 'Sarah Johnson' && data.notification?.product === 'Classic T-Shirt',
              hasRealData: !!(data.notification && data.notification.customer !== 'Sarah Johnson')
            });
            
            const combinedData = {
              styles: mergedStyles,
              notification: data.notification
            };
            return combinedData;
          }
        } else {
          console.warn(`Sales Pop: App Proxy returned status ${response.status}, falling back to public API`);
        }
      } catch (proxyError) {
        // App Proxy doesn't work in development - this is expected
        console.log('Sales Pop: App Proxy not available (normal in development), using public API instead');
      }
    }
    
    // Fallback to public API
    try {
      apiUrl = CONFIG.getCombinedApiUrl(shop);
      if (!apiUrl || apiUrl.includes('/apps/sales-pop')) {
        // If getCombinedApiUrl returned App Proxy URL, construct public API URL manually
        const appUrl = CONFIG.getAppUrl();
        if (!appUrl || appUrl === 'https://your-app-url.com') {
          throw new Error('Invalid app URL - check app URL configuration');
        }
        apiUrl = `${appUrl}/api/public/salespop?shop=${encodeURIComponent(shop)}`;
      }
      
      console.log('Sales Pop: Using public API URL:', apiUrl);
      console.log('Sales Pop: Shop parameter:', shop);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache'
      });

      console.log('Sales Pop: Fetch response status:', response.status, response.statusText);
      console.log('Sales Pop: Response headers:', {
        'content-type': response.headers.get('content-type'),
        'access-control-allow-origin': response.headers.get('access-control-allow-origin')
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Sales Pop: API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText.substring(0, 200)}`);
      }

      // Read response body as text first to debug
      const responseText = await response.text();
      console.log('Sales Pop: Raw response body length:', responseText.length);
      console.log('Sales Pop: Raw response body (first 500 chars):', responseText.substring(0, 500));
      
      if (!responseText || responseText.trim().length === 0) {
        console.error('Sales Pop: ⚠️ Response body is empty!');
        throw new Error('Empty response body from API');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Sales Pop: Failed to parse JSON response:', parseError);
        console.error('Sales Pop: Response text that failed to parse:', responseText);
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
      }
      // Check if campaign is disabled
      if (data.enabled === false) {
        console.log('Sales Pop: Campaign is disabled');
        return null;
      }

      console.log('Sales Pop: API Response received:', {
        success: data.success,
        hasStyles: !!data.styles,
        styleKeys: data.styles ? Object.keys(data.styles) : [],
        styleCount: data.styles ? Object.keys(data.styles).length : 0,
        hasNotification: !!data.notification,
        notificationCustomer: data.notification?.customer,
        notificationProduct: data.notification?.product,
        stylesIsEmpty: data.styles ? Object.keys(data.styles).length === 0 : true
      });
      
      if (!data.styles || Object.keys(data.styles).length === 0) {
        console.warn('Sales Pop: ⚠️ No styles received from API! Response:', data);
        console.warn('Sales Pop: Will use default styles. Make sure you have saved styles in the admin UI.');
      } else {
        console.log('Sales Pop: ✓ Styles received from API:', {
          backgroundColor: data.styles.backgroundColor,
          textColor: data.styles.textColor,
          linkColor: data.styles.linkColor,
          messageTemplate: data.styles.messageTemplate,
          popupInterval: data.styles.popupInterval,
          popupDuration: data.styles.popupDuration,
          selectedOrderType: data.styles.selectedOrderType,
          lookbackDays: data.styles.lookbackDays,
          xPosition: data.styles.xPosition,
          yPosition: data.styles.yPosition
        });
      }
      
      if (data.success) {
        // Merge with defaults - ensure we always have valid styles
        const mergedStyles = { ...CONFIG.defaultStyles, ...(data.styles || {}) };
        console.log('Sales Pop: Merged styles (Public API):', {
          styleCount: Object.keys(mergedStyles).length,
          backgroundColor: mergedStyles.backgroundColor,
          textColor: mergedStyles.textColor,
          linkColor: mergedStyles.linkColor,
          messageTemplate: mergedStyles.messageTemplate,
          popupInterval: mergedStyles.popupInterval,
          popupDuration: mergedStyles.popupDuration
        });
        
        // Log notification data received from public API
        if (data.notification) {
          console.log('Sales Pop: Public API notification received:', {
            customer: data.notification.customer,
            product: data.notification.product,
            location: data.notification.location,
            time: data.notification.time,
            productUrl: data.notification.productUrl,
            isMockData: data.notification.customer === 'Sarah Johnson' && data.notification.product === 'Classic T-Shirt',
            hasRealData: !!(data.notification && data.notification.customer !== 'Sarah Johnson')
          });
        }
        
        const combinedData = {
          styles: mergedStyles,
          notification: data.notification
        };
        console.log('Sales Pop: ✓ Combined data ready with', Object.keys(combinedData.styles).length, 'style properties');
        return combinedData;
      }
      
      console.warn('Sales Pop: API returned success: false');
      // Return fallback data instead of null
      return {
        styles: CONFIG.defaultStyles,
        notification: {
          customer: 'Sarah',
          location: 'New York, USA',
          product: 'Classic T-Shirt',
          productImage: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
          productUrl: '#',
          time: 'just now'
        }
      };
    } catch (error) {
      console.error('Sales Pop: Failed to fetch combined data:', error);
      console.error('Sales Pop: Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Check if it's a network error
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
        console.error('Sales Pop: ⚠️ Network error detected!');
        console.error('Sales Pop: Possible causes:');
        console.error('Sales Pop:   1. Cloudflare tunnel URL is incorrect or expired');
        console.error('Sales Pop:   2. CORS configuration issue');
        console.error('Sales Pop:   3. API endpoint is not accessible');
        console.error('Sales Pop: Current API URL:', CONFIG.getCombinedApiUrl(shop));
        console.error('Sales Pop: Current App URL:', CONFIG.getAppUrl());
        console.error('Sales Pop: Please verify the Cloudflare tunnel URL in orderspop.liquid matches your running app');
      }
      
      return {
        styles: CONFIG.defaultStyles,
        notification: {
          customer: 'Sarah',
          location: 'New York, USA',
          product: 'Classic T-Shirt',
          productImage: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
          productUrl: '#',
          time: 'just now'
        }
      };
    }
  }

  // Fetch notification data from orders API (legacy, kept for backward compatibility)
  async function fetchNotification(shop) {
    if (!shop) {
      console.warn('Sales Pop: Could not determine shop domain for notifications');
      return null;
    }

    // Try App Proxy first, then fallback to public API
    const shopDomain = shop || window.location.hostname;
    const useAppProxy = shopDomain && shopDomain.includes('.myshopify.com');
    
    if (useAppProxy) {
      try {
        const apiUrl = `https://${shopDomain}/apps/sales-pop/orders`;
        console.log('Sales Pop: fetchNotification - Trying App Proxy URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-cache'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.notification) {
            console.log('Sales Pop: fetchNotification - ✓ Success from App Proxy');
            return data.notification;
          }
        }
      } catch (proxyError) {
        // App Proxy doesn't work in development - this is expected
        console.log('Sales Pop: App Proxy not available (normal in development), using public API instead');
      }
    }
    
    // Fallback to public API
    try {
      const appUrl = CONFIG.getAppUrl();
      if (!appUrl) {
        console.warn('Sales Pop: No app URL available for fetchNotification');
        return null;
      }
      const apiUrl = `${appUrl}/api/orders/public?shop=${encodeURIComponent(shop)}`;
      console.log('Sales Pop: fetchNotification - Using public API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Sales Pop: fetchNotification - HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.notification) {
        console.log('Sales Pop: fetchNotification - ✓ Success from public API:', {
          customer: data.notification.customer,
          product: data.notification.product,
          location: data.notification.location,
          isMockData: data.notification.customer === 'Sarah Johnson' && data.notification.product === 'Classic T-Shirt',
          hasRealData: !!(data.notification && data.notification.customer !== 'Sarah Johnson')
        });
        return data.notification;
      }
      
      console.warn('Sales Pop: fetchNotification - No notification in response');
      return null;
    } catch (error) {
      console.warn('Sales Pop: Failed to fetch notification, using mock data:', error);
      console.warn('Sales Pop: Error type:', error.name, 'Message:', error.message);
      
      // Return mock data as fallback
      return {
        customer: 'Someone',
        location: 'Somewhere',
        product: 'an item',
        productImage: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
        productUrl: '#',
        time: 'just now'
      };
    }
  }

  // Apply styles to the notification element
  function applyStyles(element, styles) {
    console.log('Sales Pop: applyStyles called with:', {
      hasElement: !!element,
      hasStyles: !!styles,
      styleCount: styles ? Object.keys(styles).length : 0,
      sampleStyles: styles ? {
        backgroundColor: styles.backgroundColor,
        textColor: styles.textColor,
        messageTemplate: styles.messageTemplate
      } : null
    });
    
    const popup = element.querySelector('.salespop-popup');
    const text = element.querySelector('.salespop-text');
    const link = element.querySelector('.salespop-link');
    const image = element.querySelector('.salespop-product-image');
    const img = element.querySelector('#salespop-img');

    if (!popup) {
      console.error('Sales Pop: applyStyles - popup element not found!');
      return;
    }
    
    console.log('Sales Pop: Found popup element, applying styles...');

    // Apply popup styles
    const bgColor = styles.useBackgroundImage ? 'transparent' : (styles.backgroundColor || CONFIG.defaultStyles.backgroundColor);
    popup.style.backgroundColor = bgColor;
    console.log('Sales Pop: Applied backgroundColor:', bgColor);
    
    if (styles.useBackgroundImage && styles.backgroundImageUrl) {
      popup.style.backgroundImage = `url(${styles.backgroundImageUrl})`;
      popup.style.backgroundSize = 'cover';
      popup.style.backgroundPosition = 'center';
      console.log('Sales Pop: Applied background image:', styles.backgroundImageUrl);
    }
    
    const borderWidth = styles.borderWidth !== undefined ? styles.borderWidth : CONFIG.defaultStyles.borderWidth;
    const borderColor = styles.borderColor || CONFIG.defaultStyles.borderColor;
    const borderRadius = styles.borderRadius !== undefined ? styles.borderRadius : CONFIG.defaultStyles.borderRadius;
    
    popup.style.border = `${borderWidth}px solid ${borderColor}`;
    popup.style.borderRadius = `${borderRadius}px`;
    console.log('Sales Pop: Applied border:', `${borderWidth}px solid ${borderColor}`, 'borderRadius:', `${borderRadius}px`);

    // Position styles
    const position = {};
    if (styles.xPosition === 'left') {
      position.left = `${styles.xOffset || CONFIG.defaultStyles.xOffset}px`;
    } else {
      position.right = `${styles.xOffset || CONFIG.defaultStyles.xOffset}px`;
    }
    
    if (styles.yPosition === 'top') {
      position.top = `${styles.yOffset || CONFIG.defaultStyles.yOffset}px`;
    } else {
      position.bottom = `${styles.yOffset || CONFIG.defaultStyles.yOffset}px`;
    }
    
    Object.assign(popup.style, position);

    // Text styles
    if (text) {
      const textSize = styles.textSize !== undefined ? styles.textSize : CONFIG.defaultStyles.textSize;
      const textWeight = styles.textWeight || CONFIG.defaultStyles.textWeight;
      const textColor = styles.textColor || CONFIG.defaultStyles.textColor;
      
      text.style.fontSize = `${textSize}px`;
      text.style.fontWeight = textWeight;
      text.style.color = textColor;
      console.log('Sales Pop: Applied text styles:', { textSize, textWeight, textColor });
    } else {
      console.warn('Sales Pop: Text element not found for styling');
    }
    
    // Link styles
    if (link) {
      const linkSize = styles.linkSize !== undefined ? styles.linkSize : CONFIG.defaultStyles.linkSize;
      const linkWeight = styles.linkWeight || CONFIG.defaultStyles.linkWeight;
      const linkColor = styles.linkColor || CONFIG.defaultStyles.linkColor;
      
      link.style.fontSize = `${linkSize}px`;
      link.style.fontWeight = linkWeight;
      link.style.color = linkColor;
      console.log('Sales Pop: Applied link styles:', { linkSize, linkWeight, linkColor });
    } else {
      console.warn('Sales Pop: Link element not found for styling');
    }

    // Image styles
    if (image && img) {
      const imageSize = styles.imageSize || CONFIG.defaultStyles.imageSize;
      image.style.width = `${imageSize}px`;
      image.style.height = `${imageSize}px`;
      image.style.borderRadius = `${styles.imageRadius || CONFIG.defaultStyles.imageRadius}px`;
    }

    // Hide on mobile
    if (styles.hideOnMobile) {
      const mobileMediaQuery = window.matchMedia('(max-width: 768px)');
      if (mobileMediaQuery.matches) {
        popup.style.display = 'none';
      }
    }

    // Show/hide close button
    const closeBtn = element.querySelector('.salespop-close');
    if (closeBtn) {
      closeBtn.style.display = styles.showCloseButton ? 'flex' : 'none';
    }
  }

  // Parse message template and split into text and product parts (matches PreviewSection logic)
  function parseMessageTemplate(template, data) {
    if (!template && !data) {
      console.warn('Sales Pop: parseMessageTemplate called without template or data');
      return { textContent: '', productContent: null };
    }
    
    const messageTemplate = template || CONFIG.defaultStyles.messageTemplate;
    const customer = data?.customer || 'Someone';
    const location = data?.location || 'Somewhere';
    const product = data?.product || 'an item';
    
    // Find PRODUCT placeholder position
    const productIndex = messageTemplate.indexOf('{PRODUCT}');
    
    if (productIndex === -1) {
      // No PRODUCT placeholder, render all as text (including any product that might be in data)
      let textContent = messageTemplate;
      textContent = textContent.replace(/\{CUSTOMER\}/g, customer);
      textContent = textContent.replace(/\{LOCATION\}/g, location);
      // Don't include product in text if it's not in the template
      return { textContent, productContent: null };
    }
    
    // Split into parts before and after PRODUCT
    const beforeProduct = messageTemplate.substring(0, productIndex);
    const afterProduct = messageTemplate.substring(productIndex + '{PRODUCT}'.length);
    
    // Replace CUSTOMER and LOCATION placeholders in the before part
    let textContent = beforeProduct;
    textContent = textContent.replace(/\{CUSTOMER\}/g, customer);
    textContent = textContent.replace(/\{LOCATION\}/g, location);
    // Important: Do NOT replace {PRODUCT} here - we're extracting it
    
    // Replace any placeholders in after part (if any)
    let afterText = afterProduct;
    afterText = afterText.replace(/\{CUSTOMER\}/g, customer);
    afterText = afterText.replace(/\{LOCATION\}/g, location);
    // Important: Do NOT replace {PRODUCT} here either
    
    // Combine text content (everything except PRODUCT)
    const fullTextContent = (textContent + afterText).trim();
    
    return {
      textContent: fullTextContent,
      productContent: product
    };
  }

  // Show notification
  function showNotification(element, styles, notificationData) {
    console.log('Sales Pop: showNotification called', {
      hasElement: !!element,
      hasStyles: !!styles,
      hasNotificationData: !!notificationData
    });
    
    const popup = element.querySelector('.salespop-popup');
    const text = element.querySelector('.salespop-text');
    const link = element.querySelector('.salespop-link');
    const img = element.querySelector('#salespop-img');

    if (!popup) {
      console.error('Sales Pop: Popup element not found!');
      console.error('Sales Pop: Element HTML:', element.innerHTML.substring(0, 200));
      return;
    }

    // Make the container visible first
    const container = element.closest('#salespop-notification-container') || element;
    if (container) {
      console.log('Sales Pop: Making container visible');
      container.style.display = 'block';
      console.log('Sales Pop: Container display set to:', container.style.display);
    } else {
      console.error('Sales Pop: Container not found!');
    }

    // Parse message template and split it (matches PreviewSection behavior)
    if (!styles || !notificationData) {
      console.warn('Sales Pop: Missing styles or notificationData', { styles, notificationData });
      return;
    }
    
    const { textContent, productContent } = parseMessageTemplate(styles.messageTemplate, notificationData);
    
    console.log('Sales Pop: Template parsing:', {
      template: styles.messageTemplate || 'undefined',
      notificationData: notificationData,
      textContent: textContent,
      productContent: productContent
    });

    // Update text content (customer, location, etc. - everything except product)
    // Always set textContent, even if empty (to clear any previous content)
    if (text) {
      // Ensure textContent does NOT include the product name
      let finalText = textContent || '';
      // Remove product name if it accidentally got included
      const productName = notificationData.product || 'an item';
      if (finalText.includes(productName)) {
        // Remove product name from text (shouldn't happen, but just in case)
        finalText = finalText.replace(new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '').trim();
      }
      text.textContent = finalText;
      console.log('Sales Pop: Set text element to:', finalText);
    }
    
    // Update product link - only show product if productContent exists
    if (link) {
      if (productContent) {
        link.textContent = productContent;
        link.style.display = '';
        console.log('Sales Pop: Set link element to:', productContent);
      } else {
        // Hide link if no product content
        link.textContent = '';
        link.style.display = 'none';
      }
      
      if (notificationData && notificationData.productUrl && productContent) {
        link.onclick = () => {
          window.location.href = notificationData.productUrl;
        };
      }
    }

    if (img && notificationData && notificationData.productImage) {
      img.src = notificationData.productImage;
      img.alt = notificationData.product || 'Product';
    }

    // Show popup
    console.log('Sales Pop: Showing popup element');
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(20px)';
    popup.style.display = 'block';
    popup.style.visibility = 'visible';
    console.log('Sales Pop: Popup display set to:', popup.style.display);
    console.log('Sales Pop: Popup visibility set to:', popup.style.visibility);
    
    // Animate in
    requestAnimationFrame(() => {
      popup.style.transition = 'all 0.3s ease-out';
      popup.style.opacity = '1';
      popup.style.transform = 'translateY(0)';
      console.log('Sales Pop: Popup animation started');
    });

    // Auto-hide after duration
    const duration = (styles.popupDuration || CONFIG.defaultStyles.popupDuration) * 1000;
    setTimeout(() => {
      hideNotification(element);
    }, duration);
  }

  // Hide notification
  function hideNotification(element) {
    const popup = element.querySelector('.salespop-popup');
    if (!popup) return;

    popup.style.transition = 'all 0.3s ease-in';
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      popup.style.display = 'none';
    }, 300);
  }

  // Initialize Sales Pop
  async function init() {
    console.log('Sales Pop: Initializing...');
    
    const container = document.getElementById('salespop-notification-container');
    if (!container) {
      console.warn('Sales Pop: Container element not found');
      return;
    }

    const shop = getShopDomain();
    console.log('Sales Pop: Shop domain =', shop);
    
    const appUrl = CONFIG.getAppUrl();
    console.log('Sales Pop: App URL =', appUrl);
    
    // Fetch combined data (styles + first notification) from single API
    const combinedData = await fetchCombinedData(shop);
    
    if (!combinedData) {
      console.log('Sales Pop: Campaign is disabled or failed to fetch data, not showing notifications');
      return;
    }
    
    // Legacy check - if combinedData is null but we got here, it means campaign is disabled
    if (combinedData === null) {
      console.log('Sales Pop: Campaign is disabled');
      return;
    }
    
    // Old fallback code removed - don't show anything if data fetch fails
    if (false) {
      // Use fallback data
      const fallbackData = {
        styles: CONFIG.defaultStyles,
        notification: {
          customer: 'Sarah',
          location: 'New York, USA',
          product: 'Classic T-Shirt',
          productImage: 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg',
          productUrl: '#',
          time: 'just now'
        }
      };
      applyStyles(container, fallbackData.styles);
      setTimeout(() => {
        showNotification(container, fallbackData.styles, fallbackData.notification);
      }, 3000);
      return;
    }
    
    const { styles, notification: initialNotification } = combinedData;
    console.log('Sales Pop: Loaded combined data:', {
      styleCount: Object.keys(styles).length,
      styleKeys: Object.keys(styles).slice(0, 15), // First 15 keys
      hasNotification: !!initialNotification
    });
    console.log('Sales Pop: ✓ Styles from MongoDB (merged with defaults):', {
      backgroundColor: styles.backgroundColor,
      textColor: styles.textColor,
      linkColor: styles.linkColor,
      messageTemplate: styles.messageTemplate,
      popupInterval: styles.popupInterval,
      popupDuration: styles.popupDuration,
      borderColor: styles.borderColor,
      borderRadius: styles.borderRadius,
      textSize: styles.textSize,
      linkSize: styles.linkSize
    });
    console.log('Sales Pop: Initial notification:', initialNotification);
    
    // Apply styles
    console.log('Sales Pop: Applying styles to container...');
    applyStyles(container, styles);
    console.log('Sales Pop: ✓ Styles applied to popup element');

    // Set up close button
    const closeBtn = container.querySelector('.salespop-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        hideNotification(container);
      });
    }

    // Show initial notification after a delay
    setTimeout(() => {
      if (initialNotification) {
        console.log('Sales Pop: Showing initial notification');
        showNotification(container, styles, initialNotification);
      } else {
        console.warn('Sales Pop: No initial notification to show');
      }
    }, 3000);

    // Set up interval for showing new notifications
    const showNextNotification = async () => {
      const notification = await fetchNotification(shop);
      if (notification) {
        console.log('Sales Pop: Showing next notification');
        showNotification(container, styles, notification);
      }
    };

    const interval = (styles.popupInterval || CONFIG.defaultStyles.popupInterval) * 60 * 1000;
    console.log('Sales Pop: Notification interval =', interval / 1000 / 60, 'minutes');
    setInterval(() => {
      showNextNotification();
    }, interval);
  }

  // Mark script as initialized
  window.SalesPopInitialized = true;
  
  // Wait for DOM to be ready
  console.log('Sales Pop: Script loaded, document readyState:', document.readyState);
  if (document.readyState === 'loading') {
    console.log('Sales Pop: Waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Sales Pop: DOMContentLoaded fired, initializing...');
      init();
    });
  } else {
    console.log('Sales Pop: DOM already ready, initializing immediately...');
    // Use setTimeout to ensure DOM is fully ready
    setTimeout(() => {
      init();
    }, 100);
  }

  // Export for external access if needed
  window.SalesPop = {
    show: function(notificationData) {
      const container = document.getElementById('salespop-notification-container');
      if (container) {
        fetchConfiguration().then(styles => {
          showNotification(container, styles, notificationData);
        });
      }
    },
    hide: function() {
      const container = document.getElementById('salespop-notification-container');
      if (container) {
        hideNotification(container);
      }
    }
  };

})();

