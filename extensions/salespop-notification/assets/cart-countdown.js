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

      #${ROOT_ID} .cart-countdown-bar {
        width: 100%;
        padding: 16px 24px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        font-family: Arial, sans-serif;
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
      startCountdown(countdownMinutes);
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

