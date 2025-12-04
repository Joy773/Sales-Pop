(() => {
  if (window.SalesPopVisitorCountInitialized) {
    console.debug('[Visitor Count] Already initialized, skipping');
    return;
  }
  window.SalesPopVisitorCountInitialized = true;

  const CONTAINER_ID = 'salespop-visitor-count-container';
  const WIDGET_ID = 'salespop-visitor-count-widget';
  const POLL_INTERVAL = 30000; // Poll every 30 seconds

  let pollingIntervalId = null;
  let currentWidget = null;
  let currentSettings = null;

  function getShop() {
    const meta = document.querySelector('meta[name="shop"]');
    if (meta) return meta.content;
    if (window.SalesPopShop) return window.SalesPopShop;
    console.warn('[Visitor Count] Shop domain not found');
    return null;
  }

  function getAppBaseUrl() {
    const meta = document.querySelector('meta[name="salespop-app-url"]');
    if (meta) return meta.content;
    if (window.SalesPopAppUrl) return window.SalesPopAppUrl;
    return null;
  }


  function createContainer() {
    let container = document.getElementById(CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;
      container.style.display = 'none';
      document.body.appendChild(container);
    }
    return container;
  }

  function createWidget(container) {
    let widget = document.getElementById(WIDGET_ID);
    if (widget) return widget;

    widget = document.createElement('div');
    widget.id = WIDGET_ID;
    widget.style.position = 'fixed';
    widget.style.zIndex = '9998';
    widget.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    widget.style.opacity = '0';
    widget.style.transform = 'translateY(10px)';

    container.appendChild(widget);
    return widget;
  }

  function normalizeSettings(settings = {}) {
    const normalized = { ...settings };
    const positionValue = settings.positionValue || settings.position || '';
    if (!normalized.verticalPosition || !normalized.horizontalPosition) {
      const [vertical = 'top', horizontal = 'left'] = positionValue.split(' ');
      normalized.verticalPosition = normalized.verticalPosition || vertical;
      normalized.horizontalPosition = normalized.horizontalPosition || horizontal;
    }
    normalized.topSelectValue = normalized.topSelectValue ?? '';
    normalized.leftSelectValue = normalized.leftSelectValue ?? '';
    normalized.hidePopupThreshold = normalized.hidePopupThreshold ?? '';
    normalized.popupDuration = normalized.popupDuration ?? '';
    normalized.delayBeforeFirstPop = normalized.delayBeforeFirstPop ?? '';
    normalized.displayOnPage = normalized.displayOnPage || normalized.positionSelect || 'all';
    normalized.excludedPages = normalized.excludedPages || '';
    normalized.message = normalized.message || '{NUMBER} people visited\nin last 30 minutes';
    normalized.hideOnMobile = Boolean(normalized.hideOnMobile);
    normalized.showCloseButton = Boolean(normalized.showCloseButton);
    normalized.borderRadius = Number.isFinite(Number(normalized.borderRadius))
      ? Number(normalized.borderRadius)
      : 8;
    return normalized;
  }

  function shouldDisplayOnPage(settings) {
    const displayOnPage = settings.displayOnPage;
    const currentPath = window.location.pathname || '/';

    if (displayOnPage === 'homepage') {
      return currentPath === '/' || currentPath === '';
    }

    if (displayOnPage === 'except pages') {
      const excluded = settings.excludedPages
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      return !excluded.some((page) => {
        if (!page.startsWith('/')) {
          return currentPath === `/${page.replace(/^\/+/, '')}`;
        }
        return currentPath === page;
      });
    }

    // Default: all pages
    return true;
  }

  function applyStyles(widget, settings) {
    const {
      shape = 'circle',
      borderRadius = 8,
      backgroundColor = '#ffffff',
      highlightColor = '#4CAF50',
      textColor = '#555555',
      showCloseButton = false,
      shadow = '0 2px 8px rgba(0,0,0,0.12)',
      padding = '12px 16px',
    } = settings || {};

    let computedBorderRadius = `${borderRadius}px`;
    if (shape === 'circle') computedBorderRadius = '9999px';
    if (shape === 'square') computedBorderRadius = '0px';

    widget.style.background = backgroundColor;
    widget.style.borderRadius = computedBorderRadius;
    widget.style.boxShadow = shadow;
    widget.style.padding = padding;
    widget.style.display = 'flex';
    widget.style.alignItems = 'center';
    widget.style.gap = '12px';
    widget.style.fontFamily = settings.fontFamily || 'inherit';

    if (settings.verticalPosition === 'bottom') {
      widget.style.bottom = settings.topSelectValue ? `${settings.topSelectValue}px` : '20px';
      widget.style.top = 'auto';
    } else {
      widget.style.top = settings.topSelectValue ? `${settings.topSelectValue}px` : '20px';
      widget.style.bottom = 'auto';
    }

    if (settings.horizontalPosition === 'right') {
      widget.style.right = settings.leftSelectValue ? `${settings.leftSelectValue}px` : '20px';
      widget.style.left = 'auto';
    } else {
      widget.style.left = settings.leftSelectValue ? `${settings.leftSelectValue}px` : '20px';
      widget.style.right = 'auto';
    }

    widget.dataset.highlightColor = highlightColor;
    widget.dataset.textColor = textColor;
    widget.dataset.showCloseButton = showCloseButton ? 'true' : 'false';
  }

  function renderContent(widget, settings, visitorData) {
    const normalizedSettings = normalizeSettings(settings);
    const {
      highlightColor = '#4CAF50',
      textColor = '#555555',
      message = '{NUMBER} people visited\nin last 30 minutes',
      showCloseButton = false,
    } = settings || {};

    const visitorCount = visitorData?.count ?? 0;
    const intervalText = visitorData?.intervalLabel ?? 'last 30 minutes';

    const displayMessage = (message || '')
      .replace(/{NUMBER}/g, visitorCount.toString())
      .replace(/{TIME}/g, intervalText);

    const [line1 = '', line2 = ''] = displayMessage.split('\n');

    const threshold = Number(normalizedSettings.hidePopupThreshold);
    if (Number.isFinite(threshold) && threshold > 0 && visitorCount < threshold) {
      console.debug('[Visitor Count] Hiding widget because count is below threshold', {
        visitorCount,
        threshold,
      });
      hideWidget();
      return;
    }

    widget.innerHTML = '';

    if (normalizedSettings.hideOnMobile && window.matchMedia('(max-width: 768px)').matches) {
      widget.style.display = 'none';
      return;
    }
    widget.style.display = 'flex';

    // Icon color is always green, independent of highlightColor setting
    const iconColor = '#4CAF50';
    
    const glowIcon = document.createElement('div');
    glowIcon.style.position = 'relative';
    glowIcon.style.width = '24px';
    glowIcon.style.height = '24px';
    glowIcon.innerHTML = `
      <style>
        @keyframes visitor-glow-outer { 0%,100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1);} 50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1);} }
        @keyframes visitor-glow-middle { 0%,100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1);} 50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.05);} }
        @keyframes visitor-glow-inner { 0%,100% { opacity: 1; transform: translate(-50%, -50%) scale(1);} 50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.08);} }
      </style>
      <div style="
        position:absolute;width:24px;height:24px;border-radius:50%;
        border:2px solid ${iconColor}20;
        top:50%;left:50%;transform:translate(-50%, -50%);
        animation: visitor-glow-outer 2s ease-in-out infinite;
      "></div>
      <div style="
        position:absolute;width:18px;height:18px;border-radius:50%;
        border:2px solid ${iconColor}50;
        top:50%;left:50%;transform:translate(-50%, -50%);
        animation: visitor-glow-middle 2s ease-in-out infinite;
      "></div>
      <div style="
        position:absolute;width:12px;height:12px;border-radius:50%;
        background:${iconColor};
        top:50%;left:50%;transform:translate(-50%, -50%);
        animation: visitor-glow-inner 2s ease-in-out infinite;
      "></div>
    `;

    const textWrapper = document.createElement('div');
    textWrapper.style.display = 'flex';
    textWrapper.style.flexDirection = 'column';
    textWrapper.style.gap = '2px';
    // Add right padding when close button is visible to create space
    if (showCloseButton) {
      textWrapper.style.paddingRight = '40px'; // Space for close button (24px width + 16px gap)
    }

    const line1El = document.createElement('div');
    line1El.style.fontWeight = '600';
    line1El.style.fontSize = '15px';
    line1El.style.color = highlightColor;
    line1El.textContent = line1;

    const line2El = document.createElement('div');
    line2El.style.fontSize = '13px';
    line2El.style.color = textColor;
    line2El.textContent = line2;

    textWrapper.appendChild(line1El);
    if (line2) {
      textWrapper.appendChild(line2El);
    }

    const closeButton = document.createElement('button');
    closeButton.setAttribute('type', 'button');
    closeButton.setAttribute('aria-label', 'Close visitor count notification');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '8px';
    closeButton.style.right = '10px'; // Increased from 8px to 12px for better spacing
    closeButton.style.width = '24px';
    closeButton.style.height = '24px';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '50%';
    closeButton.style.background = 'rgba(0,0,0,0.1)';
    closeButton.style.color = '#000';
    closeButton.style.cursor = 'pointer';
    closeButton.style.display = showCloseButton ? 'flex' : 'none';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.fontSize = '16px';
    closeButton.addEventListener('click', () => {
      hideWidget();
      if (window.Shopify && window.Shopify.analytics) {
        window.Shopify.analytics.publish('salespop_visitor_count_closed');
      }
    });

    widget.appendChild(glowIcon);
    widget.appendChild(textWrapper);
    widget.appendChild(closeButton);
  }

  function showWidget(widget, delayMs = 0) {
    if (delayMs > 0) {
      setTimeout(() => {
        widget.style.opacity = '1';
        widget.style.transform = 'translateY(0)';
      }, delayMs);
    } else {
      widget.style.opacity = '1';
      widget.style.transform = 'translateY(0)';
    }
  }

  function hideWidget() {
    const widget = document.getElementById(WIDGET_ID);
    const container = document.getElementById(CONTAINER_ID);
    if (widget) {
      widget.style.opacity = '0';
      widget.style.transform = 'translateY(10px)';
      setTimeout(() => {
        if (container) {
          container.style.display = 'none';
        }
      }, 300);
    }
    // Stop polling when widget is hidden
    stopPolling();
  }

  function stopPolling() {
    if (pollingIntervalId !== null) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
      console.debug('[Visitor Count] Polling stopped');
    }
  }

  function getOrCreateBrowserId() {
    const STORAGE_KEY = 'salespop_visitor_browser_id';
    let browserId = localStorage.getItem(STORAGE_KEY);
    
    if (!browserId) {
      // Generate a unique browser ID
      browserId = 'browser_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      try {
        localStorage.setItem(STORAGE_KEY, browserId);
      } catch (e) {
        console.warn('[Visitor Count] Could not store browser ID in localStorage:', e);
      }
    }
    
    return browserId;
  }

  function getOrCreateSessionId() {
    const STORAGE_KEY = 'salespop_visitor_session_id';
    let sessionId = sessionStorage.getItem(STORAGE_KEY);
    
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      try {
        sessionStorage.setItem(STORAGE_KEY, sessionId);
      } catch (e) {
        console.warn('[Visitor Count] Could not store session ID in sessionStorage:', e);
      }
    }
    
    return sessionId;
  }

  async function trackVisitorEvent(shop, appUrl) {
    console.log('[Visitor Count] trackVisitorEvent called:', {
      shop,
      appUrl: appUrl || 'MISSING',
      hasAppUrl: !!appUrl,
    });

    const browserId = getOrCreateBrowserId();
    const sessionId = getOrCreateSessionId();
    
    const eventPayload = {
      shop: shop.trim().toLowerCase(),
      timestamp: new Date().toISOString(),
      eventId: 'visit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      browserId: browserId,
      sessionId: sessionId,
      pageUrl: window.location.href,
      referer: document.referrer || null,
      title: document.title || null,
      locale: navigator.language || null,
      userAgent: navigator.userAgent || null,
      source: 'pixel',
    };

    console.log('[Visitor Count] Event payload created:', {
      shop: eventPayload.shop,
      browserId: eventPayload.browserId,
      sessionId: eventPayload.sessionId,
      eventId: eventPayload.eventId,
      timestamp: eventPayload.timestamp,
    });

    // Track using Shopify app pixel if available
    if (window.Shopify && window.Shopify.analytics && window.Shopify.analytics.publish) {
      try {
        window.Shopify.analytics.publish('salespop_visitor_visit', eventPayload);
        console.log('[Visitor Count] ✓ Published visitor event via Shopify analytics pixel');
      } catch (pixelError) {
        console.warn('[Visitor Count] Failed to publish via Shopify pixel:', pixelError);
      }
    } else {
      console.debug('[Visitor Count] Shopify analytics pixel not available');
    }

    // Use public API
    if (appUrl) {
      const eventUrl = `${appUrl.replace(/\/$/, '')}/api/visitor-count/event`;
      console.log('[Visitor Count] Sending event to API:', {
        url: eventUrl,
        shop: eventPayload.shop,
        browserId: eventPayload.browserId,
        isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
      });

      try {
        const response = await fetch(eventUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(eventPayload),
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-cache',
        });

        const responseText = await response.text();
        console.log('[Visitor Count] Event API response:', {
          url: eventUrl,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType: response.headers.get('content-type'),
          responsePreview: responseText.substring(0, 200),
        });

        if (response.ok) {
          const responseData = JSON.parse(responseText);
          console.log('[Visitor Count] ✓ Event recorded successfully:', {
            url: eventUrl,
            response: responseData,
            browserId: eventPayload.browserId,
            sessionId: eventPayload.sessionId,
          });
        } else {
          let errorMessage = responseText.substring(0, 200);
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch (e) {
            // Keep the text as is
          }
          console.error('[Visitor Count] ✗ Event API returned error:', {
            url: eventUrl,
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
          });
        }
      } catch (apiError) {
        console.error('[Visitor Count] ✗ Failed to record event via public API:', {
          url: eventUrl,
          error: apiError.message,
          stack: apiError.stack,
          isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
          networkError: apiError.name === 'TypeError' && apiError.message.includes('fetch'),
        });
        
        // Show user-friendly error
        if (apiError.name === 'TypeError' && apiError.message.includes('fetch')) {
          console.error('[Visitor Count] Network Error: Cannot reach the event API. Check:');
          console.error('  1. Is the app server running?');
          console.error('  2. Is the app URL correct?', appUrl);
          console.error('  3. Are there CORS issues?');
          console.error('  4. Is the Cloudflare tunnel active?');
        }
      }
    } else {
      console.error('[Visitor Count] ✗ App URL not available, cannot record event:', {
        shop,
        appUrl,
        windowSalesPopAppUrl: window.SalesPopAppUrl,
        metaTag: document.querySelector('meta[name="salespop-app-url"]')?.content,
        isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
      });
    }
  }

  async function fetchVisitorData(shop, appUrl) {
    if (!appUrl) {
      console.warn('[Visitor Count] App URL unavailable, aborting fetch');
      console.error('[Visitor Count] Debug info:', {
        windowSalesPopAppUrl: window.SalesPopAppUrl,
        metaTag: document.querySelector('meta[name="salespop-app-url"]')?.content,
        userAgent: navigator.userAgent,
        isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
      });
      return { data: null, source: 'unavailable' };
    }

    const params = new URLSearchParams();
    params.set('shop', shop);

    const publicUrl = `${appUrl.replace(/\/$/, '')}/api/public/visitor-count?${params.toString()}`;

    console.log('[Visitor Count] Polling API:', {
      url: publicUrl,
      shop,
      timestamp: new Date().toISOString(),
      isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
      userAgent: navigator.userAgent.substring(0, 50),
    });

    try {
      const response = await fetch(publicUrl, { 
        mode: 'cors', 
        credentials: 'omit',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const responseText = await response.text();
      console.log('[Visitor Count] API Response status:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        responsePreview: responseText.substring(0, 200),
      });

      if (!response.ok) {
        // Try to parse error message
        let errorMessage = `Public API returned ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.enabled === false) {
            console.warn('[Visitor Count] Campaign is disabled');
            return { data: { success: false, enabled: false }, source: 'disabled' };
          }
        } catch (e) {
          errorMessage = responseText.substring(0, 100) || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      console.log('[Visitor Count] ✓ Poll response:', {
        url: publicUrl,
        success: data.success,
        count: data.visitor?.count || 0,
        uniqueVisitors: data.visitor?.uniqueVisitors || 0,
        totalEvents: data.visitor?.totalEvents || 0,
        intervalMinutes: data.visitor?.intervalMinutes || 0,
        enabled: data.enabled !== false,
      });
      return { data, source: 'public_api' };
    } catch (error) {
      console.error('[Visitor Count] ✗ Failed to load visitor data from public API:', {
        url: publicUrl,
        error: error.message,
        stack: error.stack,
        isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
        networkError: error.name === 'TypeError' && error.message.includes('fetch'),
      });
      
      // Show user-friendly error in console
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('[Visitor Count] Network Error: Cannot reach the API server. Check:');
        console.error('  1. Is the app server running?');
        console.error('  2. Is the app URL correct?', appUrl);
        console.error('  3. Are there CORS issues?');
        console.error('  4. Is the Cloudflare tunnel active?');
      }
      
      return { data: null, source: 'error', error };
    }
  }

  async function updateVisitorCount(shop, appUrl, widget, settings) {
    const previousCount = widget.dataset.visitorCount ? Number(widget.dataset.visitorCount) : null;
    
    console.log('[Visitor Count] Polling update started:', {
      shop,
      previousCount,
      timestamp: new Date().toISOString(),
      isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
    });

    const { data, source, error } = await fetchVisitorData(shop, appUrl);
    
    if (source === 'disabled' || (data && data.enabled === false)) {
      console.warn('[Visitor Count] Campaign is disabled, stopping polling');
      console.warn('[Visitor Count] Enable the campaign in admin settings to see visitor count');
      stopPolling();
      hideWidget();
      return;
    }
    
    if (!data || !data.success) {
      console.warn('[Visitor Count] Failed to fetch visitor data during poll:', {
        source,
        error: error?.message,
        data: data ? JSON.stringify(data).substring(0, 200) : 'null',
      });
      // Don't hide widget on polling errors, just log them
      return;
    }

    const visitor = data.visitor || data.count || { count: 0 };
    const currentCount = visitor.count || 0;
    
    console.log('[Visitor Count] Polling update result:', {
      shop,
      previousCount,
      currentCount,
      uniqueVisitors: visitor.uniqueVisitors || 0,
      totalEvents: visitor.totalEvents || 0,
      countChanged: previousCount !== currentCount,
    });
    
    // Check threshold - hide if count is below threshold
    const normalizedSettings = normalizeSettings(settings);
    const threshold = Number(normalizedSettings.hidePopupThreshold);
    if (Number.isFinite(threshold) && threshold > 0 && currentCount < threshold) {
      console.log('[Visitor Count] Count below threshold, hiding widget', {
        currentCount,
        threshold,
      });
      stopPolling();
      hideWidget();
      return;
    }
    
    // Only update if count changed
    if (previousCount !== null && previousCount === currentCount) {
      console.debug('[Visitor Count] Count unchanged, skipping UI update', {
        previousCount,
        currentCount,
      });
      return;
    }

    console.log('[Visitor Count] Updating widget display:', {
      previousCount,
      currentCount,
      change: currentCount - (previousCount || 0),
    });
    
    renderContent(widget, settings, visitor);
    widget.dataset.visitorCount = currentCount.toString();
  }

  async function init() {
    console.log('[Visitor Count] init() called', {
      userAgent: navigator.userAgent,
      isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
      timestamp: new Date().toISOString(),
    });
    
    const shop = getShop();
    console.log('[Visitor Count] Shop retrieved:', shop);
    
    if (!shop) {
      console.warn('[Visitor Count] Shop domain missing, aborting initialization');
      console.error('[Visitor Count] Debug shop detection:', {
        metaTag: document.querySelector('meta[name="shop"]')?.content,
        windowSalesPopShop: window.SalesPopShop,
        hostname: window.location.hostname,
      });
      return;
    }

    const appUrl = getAppBaseUrl();
    console.log('[Visitor Count] App URL retrieved:', {
      appUrl: appUrl || 'MISSING',
      fromMeta: document.querySelector('meta[name="salespop-app-url"]')?.content,
      fromWindow: window.SalesPopAppUrl,
      isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
    });
    
    if (!appUrl) {
      console.error('[Visitor Count] App URL missing, aborting initialization');
      console.error('[Visitor Count] Troubleshooting:');
      console.error('  1. Check if meta tag exists: <meta name="salespop-app-url" content="...">');
      console.error('  2. Check if window.SalesPopAppUrl is set in the liquid file');
      console.error('  3. Verify the app URL in visitor-count.liquid matches your Cloudflare tunnel URL');
      return;
    }
    
    // Test if the app URL is reachable
    console.log('[Visitor Count] Testing app URL reachability...');
    try {
      const testUrl = `${appUrl.replace(/\/$/, '')}/api/public/visitor-count?shop=${encodeURIComponent(shop)}`;
      const testResponse = await fetch(testUrl, { 
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache',
      }).catch(() => null);
      
      if (testResponse) {
        console.log('[Visitor Count] ✓ App URL is reachable:', {
          status: testResponse.status,
          url: appUrl,
        });
      } else {
        console.warn('[Visitor Count] ⚠ App URL might not be reachable:', appUrl);
        console.warn('[Visitor Count] This could indicate:');
        console.warn('  - Cloudflare tunnel is not active');
        console.warn('  - App server is not running');
        console.warn('  - URL is incorrect');
      }
    } catch (testError) {
      console.warn('[Visitor Count] Could not test app URL reachability:', testError.message);
    }

    // Track visitor event first (before fetching data)
    console.log('[Visitor Count] About to call trackVisitorEvent');
    try {
      await trackVisitorEvent(shop, appUrl);
      console.log('[Visitor Count] trackVisitorEvent completed successfully');
    } catch (error) {
      console.error('[Visitor Count] trackVisitorEvent failed:', error);
    }

    // Wait a bit for the event to be recorded in the database before fetching
    console.log('[Visitor Count] Waiting 1 second for event to be recorded...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const container = createContainer();
    const widget = createWidget(container);
    currentWidget = widget;

    container.style.display = 'block';

    console.log('[Visitor Count] Fetching initial visitor data...');
    const { data, source, error } = await fetchVisitorData(shop, appUrl);
    
    if (source === 'disabled' || (data && data.enabled === false)) {
      console.warn('[Visitor Count] Campaign is disabled. Enable it in the admin settings.');
      hideWidget();
      return;
    }
    
    if (!data || !data.success) {
      console.error('[Visitor Count] Failed to fetch visitor data:', {
        source,
        error: error?.message,
        data: data ? JSON.stringify(data).substring(0, 200) : 'null',
      });
      console.error('[Visitor Count] Troubleshooting:');
      console.error('  1. Check if the API endpoint is working:', `${appUrl}/api/public/visitor-count?shop=${shop}`);
      console.error('  2. Check server logs for errors');
      console.error('  3. Verify the campaign is enabled');
      console.error('  4. Check CORS headers');
      hideWidget();
      return;
    }

    const settings = normalizeSettings(data.settings || {});
    currentSettings = settings;
    const visitor = data.visitor || data.count || { count: 0 };

    console.debug('[Visitor Count] Loaded payload', { settings, visitor, source });

    if (!shouldDisplayOnPage(settings)) {
      console.debug('[Visitor Count] Widget disabled for this page based on settings');
      hideWidget();
      return;
    }

    applyStyles(widget, settings);
    renderContent(widget, settings, visitor);
    widget.dataset.visitorCount = (visitor.count || 0).toString();

    const delayMs = Number(settings.delayBeforeFirstPop) * 1000;
    showWidget(widget, Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 0);

    // Start polling for updates
    // Polling will continue while widget is visible
    pollingIntervalId = setInterval(() => {
      if (currentWidget && currentSettings) {
        updateVisitorCount(shop, appUrl, currentWidget, currentSettings);
      }
    }, POLL_INTERVAL);
    console.log('[Visitor Count] Started polling every', POLL_INTERVAL / 1000, 'seconds');
    console.log('[Visitor Count] Widget will stay visible until close button is clicked');
    
    // Also record event on first poll (in case initial recording failed)
    setTimeout(async () => {
      console.log('[Visitor Count] Recording event again after 2 seconds (fallback)');
      try {
        await trackVisitorEvent(shop, appUrl);
      } catch (error) {
        console.error('[Visitor Count] Fallback event recording failed:', error);
      }
    }, 2000);
    
    // Widget will remain visible until:
    // - Close button is clicked
    // - Campaign is disabled
    // - Page doesn't match display settings
    // - Count is below threshold (if configured)
    // No automatic hiding based on popupDuration
  }

  function bootstrap() {
    console.log('[Visitor Count] bootstrap() called, document.readyState:', document.readyState);
    
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      console.log('[Visitor Count] Document already ready, calling init() immediately');
      init();
    } else {
      console.log('[Visitor Count] Waiting for DOMContentLoaded...');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('[Visitor Count] DOMContentLoaded fired, calling init()');
        init();
      }, { once: true });
    }
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    stopPolling();
  });

  // Cleanup on visibility change (when tab becomes hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Optionally pause polling when tab is hidden
      // stopPolling();
    }
  });

  bootstrap();
})();

