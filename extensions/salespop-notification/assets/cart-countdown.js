(() => {
  'use strict';

  const ROOT_ID = 'salespop-cart-countdown-root';
  const API_PATH = '/api/public/cart-countdown';
  const STORAGE_KEY = 'salespop-cart-countdown';
  let countdownInterval = null;
  let remainingSeconds = 0;
  let settings = null;
  let originalBodyPaddingTopStyle = null;
  let originalBodyPaddingTopValue = null;
  let appliedBodyPadding = 0;

  function normalizeShopDomain(shop) {
    if (!shop || typeof shop !== 'string') {
      return null;
    }
    return shop.trim().toLowerCase().replace(/^https?:\/\//, '');
  }

  function resolveShopDomain() {
    const candidates = [
      window.SalesPopCartCountdownShop,
      window.SalesPopBannerShop,
      document.querySelector('meta[name="shop"]')?.content,
      window.Shopify?.shop,
      window.location.hostname,
    ];
    for (const candidate of candidates) {
      const normalized = normalizeShopDomain(candidate);
      if (normalized && normalized.includes('.')) {
        return normalized;
      }
    }
    console.warn('[Cart Countdown] Unable to determine shop domain');
    return null;
  }

  function resolveAppOrigin() {
    const configured =
      window.SalesPopCartCountdownAppUrl ||
      window.SalesPopBannerAppUrl ||
      document.querySelector('meta[name="salespop-app-url"]')?.content;
    if (configured) {
      return configured.replace(/\/$/, '');
    }

    const scriptCandidates = [
      document.currentScript,
      ...Array.from(
        document.querySelectorAll('script[src*="cart-countdown.js"]')
      ),
    ].filter(Boolean);

    for (const script of scriptCandidates) {
      if (script?.src) {
        try {
          const url = new URL(script.src, window.location.origin);
          const idx = url.pathname.indexOf('/extensions/');
          if (idx !== -1) {
            return `${url.origin}${url.pathname.slice(0, idx)}`.replace(/\/$/, '');
          }
          return `${url.protocol}//${url.host}`.replace(/\/$/, '');
        } catch (error) {
          console.warn('[Cart Countdown] Failed to parse script src', script.src, error);
        }
      }
    }

    const devHostPattern = /(localhost|127\.0\.0\.1|ngrok\.io|trycloudflare\.com|cloudflare\.com)$/;
    if (devHostPattern.test(window.location.hostname)) {
      return `${window.location.protocol}//${window.location.host}`.replace(/\/$/, '');
    }

    console.warn('[Cart Countdown] Unable to determine app origin');
    return null;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function getDisplayMessage(customMessage, timeString) {
    if (customMessage) {
      if (customMessage.includes('{TIME}')) {
        return customMessage.replace('{TIME}', timeString);
      }
      return `${customMessage} ${timeString}`;
    }
    return `Your cart will be abandoned in: ${timeString}`;
  }

  function getAlertBoxMessage(customMessage, timeString) {
    if (customMessage) {
      if (customMessage.includes('{TIME}')) {
        return customMessage.replace('{TIME}', timeString);
      }
      return customMessage;
    }
    return 'Your cart will be abandoned';
  }

  function getAlertPositionStyles(alertPosition) {
    const position = alertPosition || 'bottom-right';
    const styles = {
      position: 'fixed',
      zIndex: 10000,
    };

    switch (position) {
      case 'top-left':
        styles.top = '20px';
        styles.left = '20px';
        styles.right = 'auto';
        styles.bottom = 'auto';
        break;
      case 'top-right':
        styles.top = '20px';
        styles.right = '20px';
        styles.left = 'auto';
        styles.bottom = 'auto';
        break;
      case 'bottom-right':
        styles.bottom = '20px';
        styles.right = '20px';
        styles.top = 'auto';
        styles.left = 'auto';
        break;
      case 'bottom-left':
        styles.bottom = '20px';
        styles.left = '20px';
        styles.top = 'auto';
        styles.right = 'auto';
        break;
      default:
        styles.bottom = '20px';
        styles.right = '20px';
        styles.top = 'auto';
        styles.left = 'auto';
    }

    return styles;
  }

  function ensureStyles() {
    const STYLE_ID = 'salespop-cart-countdown-styles';
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10000;
        animation: cart-countdown-fade-in 240ms ease-out;
      }

      #${ROOT_ID}.alert-box-mode {
        position: fixed;
        top: auto;
        left: auto;
        right: auto;
        bottom: auto;
        animation: cart-countdown-alert-fade-in 240ms ease-out;
      }

      #${ROOT_ID} .cart-countdown-bar {
        width: 100%;
        padding: 16px 24px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        font-family: Arial, sans-serif;
      }

      #${ROOT_ID} .cart-countdown-alert-box {
        border-radius: 12px;
        padding: 20px 24px;
        display: flex;
        align-items: center;
        gap: 20px;
        max-width: 500px;
        width: auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-family: Arial, sans-serif;
      }

      #${ROOT_ID} .cart-countdown-alert-box .countdown-circle {
        position: relative;
        width: 70px;
        height: 70px;
        flex-shrink: 0;
      }

      #${ROOT_ID} .cart-countdown-alert-box .countdown-circle svg {
        transform: rotate(-90deg);
      }

      #${ROOT_ID} .cart-countdown-alert-box .countdown-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
        font-weight: bold;
        font-family: Arial, sans-serif;
      }

      #${ROOT_ID} .cart-countdown-alert-box .alert-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      #${ROOT_ID} .cart-countdown-alert-box .alert-message {
        font-size: 15px;
        font-weight: 500;
        line-height: 1.4;
      }

      #${ROOT_ID} .cart-countdown-alert-box .checkout-link {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      #${ROOT_ID} .cart-countdown-alert-box .checkout-link a {
        font-size: 15px;
        font-weight: 500;
        text-decoration: underline;
        cursor: pointer;
      }

      #${ROOT_ID} .cart-countdown-alert-box .info-icon {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 1.5px solid;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        font-family: Arial, sans-serif;
        flex-shrink: 0;
      }

      @keyframes cart-countdown-fade-in {
        from {
          opacity: 0;
          transform: translateY(-100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes cart-countdown-alert-fade-in {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function captureBodyPaddingBaseline() {
    if (originalBodyPaddingTopStyle !== null) {
      return;
    }
    const body = document.body;
    if (!body) {
      return;
    }
    originalBodyPaddingTopStyle = body.style.paddingTop || '';
    const computed = window.getComputedStyle(body).paddingTop;
    originalBodyPaddingTopValue = parseFloat(computed) || 0;
  }

  function applyBodyPaddingOffset(offset) {
    const body = document.body;
    if (!body) {
      return;
    }
    if (!offset || offset <= 0) {
      resetBodyPaddingOffset();
      return;
    }
    captureBodyPaddingBaseline();
    if (originalBodyPaddingTopValue == null) {
      originalBodyPaddingTopValue = 0;
    }
    appliedBodyPadding = offset;
    body.style.paddingTop = `${originalBodyPaddingTopValue + offset}px`;
  }

  function resetBodyPaddingOffset() {
    if (originalBodyPaddingTopStyle === null) {
      return;
    }
    const body = document.body;
    if (!body) {
      return;
    }
    appliedBodyPadding = 0;
    body.style.paddingTop = originalBodyPaddingTopStyle;
  }

  function renderCountdownBar(settings) {
    ensureStyles();
    
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.insertBefore(root, document.body.firstChild);
    }

    const timeString = formatTime(remainingSeconds);
    const showAlert = settings?.showAlert?.[0] || 'notification-bar';
    const isAlertBox = showAlert === 'alert-box';

    if (isAlertBox) {
      // Render Alert Box
      renderAlertBox(root, settings, timeString);
    } else {
      // Render Notification Bar
      renderNotificationBar(root, settings, timeString);
    }
  }

  function renderNotificationBar(root, settings, timeString) {
    const message = getDisplayMessage(settings?.customMessage, timeString);

    root.className = '';
    root.innerHTML = `
      <div class="cart-countdown-bar" style="
        background-color: ${settings?.backgroundColor || '#3b82f6'};
        color: ${settings?.textColor || '#ffffff'};
        font-size: ${settings?.textSize || 15}px;
        font-weight: ${settings?.textWeight || 'bold'};
      ">
        ${message}
      </div>
    `;

    const bar = root.querySelector('.cart-countdown-bar');
    const height = bar?.offsetHeight || root.offsetHeight || 0;
    if (height > 0) {
      applyBodyPaddingOffset(height);
    }
  }

  function renderAlertBox(root, settings, timeString) {
    const alertPosition = settings?.alertPosition || 'bottom-right';
    const buttonAction = settings?.buttonAction || 'checkout-now';
    const backgroundColor = settings?.backgroundColor || '#2962FF';
    const textColor = settings?.textColor || '#ffffff';
    const borderRadius = settings?.borderRadius || 12;
    const customMessage = settings?.customMessage || '';
    
    const alertMessage = getAlertBoxMessage(customMessage, timeString);
    const buttonText = buttonAction === 'view-cart' ? 'View cart' : 'Checkout Now';
    const buttonUrl = buttonAction === 'view-cart' ? '/cart' : '/checkout';

    // Calculate progress for circular timer
    const totalMinutes = parseInt(settings?.countdownTime) || 5;
    const totalSeconds = totalMinutes * 60;
    const progress = (remainingSeconds / totalSeconds) * 100;
    
    // Calculate stroke-dasharray for circular progress
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    // Get position styles
    const positionStyles = getAlertPositionStyles(alertPosition);
    const positionStyleString = Object.entries(positionStyles)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
      .join('; ');

    root.className = 'alert-box-mode';
    root.style.cssText = positionStyleString;

    root.innerHTML = `
      <div class="cart-countdown-alert-box" style="
        background-color: ${backgroundColor};
        color: ${textColor};
        border-radius: ${borderRadius}px;
      ">
        <div class="countdown-circle">
          <svg width="70" height="70">
            <circle cx="35" cy="35" r="${radius}" fill="none" stroke="rgba(255, 255, 255, 0.3)" stroke-width="4" />
            <circle cx="35" cy="35" r="${radius}" fill="none" stroke="${textColor}" stroke-width="4" 
              stroke-linecap="round" stroke-dasharray="${circumference}" 
              stroke-dashoffset="${offset}" />
          </svg>
          <div class="countdown-text" style="color: ${textColor};">${timeString}</div>
        </div>
        <div class="alert-content">
          <div class="alert-message" style="color: ${textColor};">${alertMessage}</div>
          <div class="checkout-link">
            <a href="${buttonUrl}" style="color: ${textColor};">${buttonText}</a>
            <div class="info-icon" style="border-color: ${textColor}; color: ${textColor};">i</div>
          </div>
        </div>
      </div>
    `;

    // Don't apply body padding for alert box
    if (appliedBodyPadding > 0) {
      resetBodyPaddingOffset();
    }
  }

  function hideCountdownBar() {
    const root = document.getElementById(ROOT_ID);
    if (root) {
      root.remove();
    }
    if (appliedBodyPadding > 0) {
      resetBodyPaddingOffset();
    }
  }

  function saveCountdownState() {
    if (remainingSeconds > 0 && settings) {
      try {
        const countdownData = {
          remainingSeconds: remainingSeconds,
          startTime: Date.now(),
          settings: settings
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(countdownData));
      } catch (error) {
        console.error('[Cart Countdown] Failed to save countdown state:', error);
      }
    }
  }

  function clearCountdownState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[Cart Countdown] Failed to clear countdown state:', error);
    }
  }

  function clearCountdown({ removeBar = false } = {}) {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    if (removeBar) {
      hideCountdownBar();
    }
    remainingSeconds = 0;
    clearCountdownState();
  }

  function handleCountdownExpired() {
    if (!settings) {
      clearCountdown({ removeBar: true });
      return;
    }
    
    const action = settings.actionAfterExpired || 'do-nothing';
    
    if (action === 'clear-cart') {
      // Clear cart using Shopify AJAX API
      fetch('/cart/clear.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(err => {
        console.error('[Cart Countdown] Failed to clear cart:', err);
      }).finally(() => {
        clearCountdown({ removeBar: true });
      });
      return;
    } else if (action === 'reset-time') {
      // Restart countdown
      const countdownMinutes = parseInt(settings.countdownTime) || 0;
      if (countdownMinutes > 0) {
        startCountdown(countdownMinutes);
        return;
      }
    }

    // 'do-nothing' or fallback
    clearCountdown({ removeBar: true });
  }

  function startCountdown(minutes) {
    clearCountdown();
    
    if (!minutes || minutes <= 0) {
      console.warn('[Cart Countdown] Invalid countdown time');
      return;
    }

    remainingSeconds = minutes * 60;
    
    if (!settings) {
      console.warn('[Cart Countdown] Settings not loaded');
      return;
    }

    // Save initial state to sessionStorage
    saveCountdownState();

    renderCountdownBar(settings);

    countdownInterval = setInterval(() => {
      remainingSeconds--;
      
      // Save state on each tick
      saveCountdownState();
      
      if (remainingSeconds <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        
        // Show expired message if configured
        if (settings.additionalMessage) {
          const root = document.getElementById(ROOT_ID);
          if (root) {
            const bar = root.querySelector('.cart-countdown-bar');
            if (bar) {
              bar.textContent = settings.additionalMessage;
              setTimeout(() => {
                handleCountdownExpired();
              }, 3000); // Show message for 3 seconds
              return;
            }
          }
        }
        
        handleCountdownExpired();
      } else {
        renderCountdownBar(settings);
      }
    }, 1000);
  }

  function restoreCountdown() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }

      const data = JSON.parse(stored);
      if (!data.remainingSeconds || !data.startTime || !data.settings) {
        clearCountdownState();
        return;
      }

      // Calculate elapsed time since countdown started
      const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
      const remaining = data.remainingSeconds - elapsed;

      if (remaining > 0) {
        // Restore settings and remaining time
        settings = data.settings;
        remainingSeconds = remaining;

        console.log('[Cart Countdown] Restoring countdown:', {
          remainingSeconds,
          elapsed,
          original: data.remainingSeconds
        });

        // Render the countdown bar
        renderCountdownBar(settings);

        // Continue countdown from where it left off
        countdownInterval = setInterval(() => {
          remainingSeconds--;
          
          // Save state on each tick
          saveCountdownState();
          
          if (remainingSeconds <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            
            // Show expired message if configured
            if (settings.additionalMessage) {
              const root = document.getElementById(ROOT_ID);
              if (root) {
                const bar = root.querySelector('.cart-countdown-bar');
                if (bar) {
                  bar.textContent = settings.additionalMessage;
                  setTimeout(() => {
                    handleCountdownExpired();
                  }, 3000);
                  return;
                }
              }
            }
            
            handleCountdownExpired();
          } else {
            renderCountdownBar(settings);
          }
        }, 1000);
      } else {
        // Countdown has expired, clean up
        console.log('[Cart Countdown] Stored countdown has expired, cleaning up');
        clearCountdownState();
      }
    } catch (error) {
      console.error('[Cart Countdown] Failed to restore countdown:', error);
      clearCountdownState();
    }
  }

  async function fetchSettings() {
    const shop = resolveShopDomain();
    const appOrigin = resolveAppOrigin();

    if (!shop) {
      console.error('[Cart Countdown] Cannot fetch settings: missing shop domain');
      return null;
    }

    if (!appOrigin) {
      console.error('[Cart Countdown] Cannot fetch settings: app origin is not available');
      return null;
    }

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const cacheBuster = `&_=${Date.now()}_${attempt}`;
        const url = `${appOrigin}${API_PATH}?shop=${encodeURIComponent(shop)}${cacheBuster}`;
        console.log(`[Cart Countdown] [Attempt ${attempt}/${maxAttempts}] Fetching settings from public API:`, url);
        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        // Check if campaign is disabled
        if (data.enabled === false) {
          console.log('[Cart Countdown] Campaign is disabled');
          return null;
        }
        if (data.success && data.settings) {
          console.log('[Cart Countdown] Settings loaded from public API:', data.settings);
          return data.settings;
        }
        console.warn('[Cart Countdown] Invalid response format from public API:', data);
      } catch (error) {
        console.error(`[Cart Countdown] [Attempt ${attempt}/${maxAttempts}] Failed to fetch settings from public API:`, error);
      }
    }

    console.warn('[Cart Countdown] No settings available');
    return null;
  }

  async function handleAddToCart() {
    console.log('[Cart Countdown] Add to cart detected');
    
    // Fetch settings if not already loaded
    if (!settings) {
      settings = await fetchSettings();
    }

    if (!settings) {
      console.warn('[Cart Countdown] No settings available or campaign is disabled');
      return;
    }

    const countdownMinutes = parseInt(settings.countdownTime) || 0;
    if (countdownMinutes > 0) {
      // Check if we should reset time when adding to cart
      const resetTimeOnAddToCart = settings?.resetTimeOnAddToCart?.[0] === 'true';
      
      // If reset is enabled, or no countdown is currently running, start/restart countdown
      if (resetTimeOnAddToCart || remainingSeconds <= 0) {
        startCountdown(countdownMinutes);
      } else {
        console.log('[Cart Countdown] Countdown already running and reset on add to cart is disabled');
      }
    } else {
      console.warn('[Cart Countdown] Countdown time not configured');
    }
  }

  function setupEventListeners() {
    // Listen for various add to cart events
    const selectors = [
      'form[action*="/cart/add"]',
      'button[type="submit"][name="add"]',
      '[data-add-to-cart]',
      '.product-form__cart-submit',
      '.btn-cart',
      'button:contains("Add to cart")',
    ];

    // Use event delegation for dynamic content
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form && (form.action && form.action.includes('/cart/add') || form.querySelector('button[name="add"]'))) {
        e.preventDefault();
        handleAddToCart();
        // Allow form to submit normally after a short delay
        setTimeout(() => {
          form.submit();
        }, 100);
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target.closest('button[name="add"], [data-add-to-cart], .product-form__cart-submit, .btn-cart');
      if (target) {
        handleAddToCart();
      }
    });

    // Listen for Shopify's AJAX cart events
    document.addEventListener('cart:add', handleAddToCart);
    window.addEventListener('cart:add', handleAddToCart);

    // Listen for Shopify theme's add to cart events
    if (window.Shopify && window.Shopify.theme) {
      document.addEventListener('shopify:cart:item:add', handleAddToCart);
    }

    console.log('[Cart Countdown] Event listeners attached');
  }

  // Initialize when DOM is ready
  async function initialize() {
    // Check if campaign is enabled before initializing
    const fetchedSettings = await fetchSettings();
    if (!fetchedSettings) {
      console.log('[Cart Countdown] Campaign is disabled, skipping initialization');
      return;
    }
    settings = fetchedSettings;
    setupEventListeners();
    // Try to restore countdown from sessionStorage
    restoreCountdown();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();

