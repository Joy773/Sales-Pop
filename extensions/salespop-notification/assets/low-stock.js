(() => {
  'use strict';

  if (window.SalesPopLowStockInitialized) {
    console.debug('[Low Stock Alert] Already initialized, skipping');
    return;
  }
  window.SalesPopLowStockInitialized = true;

  const CONTAINER_ID = 'salespop-low-stock-alert-container';
  const ALERT_CLASS = 'salespop-low-stock-alert';
  const API_PATH = '/api/public/low-stock';
  const FALLBACK_IMAGE = 'https://burst.shopifycdn.com/photos/green-t-shirt.jpg';
  let settings = null;
  let products = [];
  let productCursor = 0;
  let alertTimeout = null;
  let alertInterval = null;
  let isAlertVisible = false;
  let alertStartTime = null;

  function normalizeShopDomain(shop) {
    if (!shop || typeof shop !== 'string') {
      return null;
    }
    return shop.trim().toLowerCase().replace(/^https?:\/\//, '');
  }

  function resolveShopDomain() {
    const candidates = [
      window.SalesPopLowStockShop,
      window.SalesPopShop,
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
    console.warn('[Low Stock Alert] Unable to determine shop domain');
    return null;
  }

  function resolveAppOrigin() {
    const configured =
      window.SalesPopLowStockAppUrl ||
      window.SalesPopAppUrl ||
      document.querySelector('meta[name="salespop-app-url"]')?.content;
    if (configured) {
      return configured.replace(/\/$/, '');
    }

    const scriptCandidates = [
      document.currentScript,
      ...Array.from(
        document.querySelectorAll('script[src*="low-stock.js"]')
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
          console.warn('[Low Stock Alert] Failed to parse script src', script.src, error);
        }
      }
    }

    const devHostPattern = /(localhost|127\.0\.0\.1|ngrok\.io|trycloudflare\.com|cloudflare\.com)$/;
    if (devHostPattern.test(window.location.hostname)) {
      return `${window.location.protocol}//${window.location.host}`.replace(/\/$/, '');
    }

    console.warn('[Low Stock Alert] Unable to determine app origin');
    return null;
  }

  async function fetchCampaignData() {
    console.log('[Low Stock Alert] Fetching settings');
    try {
      const appOrigin = resolveAppOrigin();
      if (!appOrigin) {
        console.warn('[Low Stock Alert] Missing app origin; cannot fetch settings');
        return null;
      }

      const shop = resolveShopDomain();
      const url = new URL(API_PATH, appOrigin);
      if (shop) {
        url.searchParams.set('shop', shop);
      }
      const sameOrigin = appOrigin === window.location.origin;
      
      const response = await fetch(url.toString(), {
        credentials: sameOrigin ? 'include' : 'omit',
        mode: sameOrigin ? 'same-origin' : 'cors',
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      console.log('[Low Stock Alert] API response:', {
        success: payload.success,
        enabled: payload.enabled,
        productsCount: payload.products?.length || 0,
        error: payload.error,
        message: payload.message,
        hasSettings: !!payload.settings,
        settingsKeys: payload.settings ? Object.keys(payload.settings) : [],
        settings: payload.settings
      });
      
      if (!payload.success || payload.enabled === false) {
        console.warn('[Low Stock Alert] Campaign is disabled or not available:', payload.message || payload.error);
        return null;
      }

      return payload;
    } catch (error) {
      console.error('[Low Stock Alert] Failed to fetch settings:', error);
      return null;
    }
  }

  function shouldShowOnPage(settings) {
    if (!settings) return false;

    const showAlert = settings.showAlert || 'all-page';
    const currentPath = window.location.pathname || '/';
    const normalizedPath = currentPath.replace(/\/$/, '') || '/';

    if (showAlert === 'homepage') {
      return normalizedPath === '/' || normalizedPath === '';
    }

    if (showAlert === 'specific-page') {
      const specificPageUrl = settings.specificPageUrl || '';
      if (!specificPageUrl) return false;

      // Normalize the specific page URL
      let normalizedSpecificUrl = specificPageUrl.trim();
      if (normalizedSpecificUrl.startsWith('http://') || normalizedSpecificUrl.startsWith('https://')) {
        try {
          const url = new URL(normalizedSpecificUrl);
          normalizedSpecificUrl = url.pathname;
        } catch (e) {
          console.warn('[Low Stock Alert] Invalid URL format:', normalizedSpecificUrl);
          return false;
        }
      }
      if (!normalizedSpecificUrl.startsWith('/')) {
        normalizedSpecificUrl = '/' + normalizedSpecificUrl;
      }
      normalizedSpecificUrl = normalizedSpecificUrl.replace(/\/$/, '') || '/';

      return normalizedPath === normalizedSpecificUrl;
    }

    // Default: all-page
    return true;
  }

  function processMessage(message, stock) {
    if (!message) return 'Low stock! Only {stock} left';
    return message.replace(/\{stock\}/gi, stock.toString());
  }

  function renderIcon(iconType) {
    const iconStyle = 'width: 16px; height: 16px; margin-right: 8px; color: #d72c0d; display: inline-block;';
    
    const icons = {
      warning: `<svg viewBox="0 0 20 20" fill="currentColor" style="${iconStyle}"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`,
      info: `<svg viewBox="0 0 20 20" fill="currentColor" style="${iconStyle}"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>`,
      bell: `<svg viewBox="0 0 20 20" fill="currentColor" style="${iconStyle}"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>`,
      check: `<svg viewBox="0 0 20 20" fill="currentColor" style="${iconStyle}"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`,
      alert: `<svg viewBox="0 0 20 20" fill="currentColor" style="${iconStyle}"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`,
      exclamation: `<svg viewBox="0 0 20 20" fill="currentColor" style="${iconStyle}"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`,
    };

    return icons[iconType] || icons.warning;
  }

  function getPositionClass(alertPosition) {
    const position = alertPosition || 'top-left';
    return `position-${position.replace('-', '-')}`;
  }

  function getAnimationClass(animationEffect) {
    const effect = animationEffect || 'fade';
    return `animation-${effect}`;
  }

  function ensureDetailsContainer(alert) {
    const content = alert.querySelector('.salespop-low-stock-content');
    if (!content) {
      return null;
    }

    let details = alert.querySelector('.salespop-low-stock-details');
    if (!details) {
      details = document.createElement('div');
      details.className = 'salespop-low-stock-details';
      details.style.display = 'flex';
      details.style.flexDirection = 'column';
      details.style.gap = '2px';
      details.style.minWidth = '0';

      const messageEl = alert.querySelector('.salespop-low-stock-message');
      if (messageEl) {
        details.appendChild(messageEl);
      } else {
        const newMessage = document.createElement('span');
        newMessage.className = 'salespop-low-stock-message';
        details.appendChild(newMessage);
      }
      content.appendChild(details);
    }
    return details;
  }

  function ensureProductImage(content) {
    let wrapper = content.querySelector('.salespop-low-stock-product-image');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'salespop-low-stock-product-image';
      wrapper.style.width = '48px';
      wrapper.style.height = '48px';
      wrapper.style.borderRadius = '8px';
      wrapper.style.overflow = 'hidden';
      wrapper.style.flexShrink = '0';
      wrapper.style.border = '1px solid rgba(0,0,0,0.1)';

      const img = document.createElement('img');
      img.alt = 'Product';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      wrapper.appendChild(img);

      content.insertBefore(wrapper, content.firstChild);
    }
    return wrapper.querySelector('img');
  }

  function ensureElement(parent, selector, className, styles = {}, insertBeforeEl = null) {
    let element = parent.querySelector(selector);
    if (!element) {
      element = document.createElement('span');
      element.className = className;
      Object.assign(element.style, styles);
      if (insertBeforeEl && parent.contains(insertBeforeEl)) {
        parent.insertBefore(element, insertBeforeEl);
      } else {
        parent.appendChild(element);
      }
    }
    return element;
  }

  function showAlert(settings, productData) {
    if (isAlertVisible) {
      return; // Already showing
    }

    const container = document.getElementById(CONTAINER_ID);
    if (!container) {
      console.warn('[Low Stock Alert] Container not found');
      return;
    }

    const alert = container.querySelector(`.${ALERT_CLASS}`);
    if (!alert) {
      console.warn('[Low Stock Alert] Alert element not found');
      return;
    }

    // Set position
    const positionClass = getPositionClass(settings.alertPosition);
    alert.className = `salespop-low-stock-alert ${positionClass} ${getAnimationClass(settings.animationEffect)}`;

    // Set styling
    const fontFamily = settings.fontFamily || 'Arial, sans-serif';
    const fontSize = settings.fontSize || 14;
    const textColor = settings.textColor || '#000000';

    const content = alert.querySelector('.salespop-low-stock-content');
    if (content) {
      content.style.fontFamily = fontFamily;
      content.style.fontSize = `${fontSize}px`;
      content.style.color = textColor;
      content.style.fontWeight = 'bold';
    }

    // Ensure structure for image and text
    const productImageEl = ensureProductImage(content);
    const detailsContainer = ensureDetailsContainer(alert);
    if (!detailsContainer) {
      return;
    }

    detailsContainer.style.paddingRight = settings.showCloseButton ? '32px' : '0';

    const nameStyles = {
      fontWeight: '600',
      fontSize: `${Math.max((settings.fontSize || 14) - 1, 12)}px`,
      color: textColor,
      display: 'block',
      lineHeight: '1.3',
    };
    const quantityRowStyles = {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      color: '#2c6ecb',
      fontSize: `${Math.max((settings.fontSize || 14) - 1, 12)}px`,
      fontWeight: '600',
      lineHeight: '1.3',
    };
    const quantityTextStyles = {
      fontSize: `${Math.max((settings.fontSize || 14) - 2, 11)}px`,
      color: '#5c5f62',
      fontWeight: '500',
      display: 'block',
    };

    const messageEl =
      detailsContainer.querySelector('.salespop-low-stock-message') ||
      ensureElement(detailsContainer, '.salespop-low-stock-message', 'salespop-low-stock-message');
    let quantityRow = detailsContainer.querySelector('.salespop-low-stock-quantity-row');
    if (!quantityRow) {
      quantityRow = document.createElement('div');
      quantityRow.className = 'salespop-low-stock-quantity-row';
      detailsContainer.insertBefore(quantityRow, messageEl);
    }
    Object.assign(quantityRow.style, quantityRowStyles);
    quantityRow.style.fontFamily = fontFamily;

    let iconEl = quantityRow.querySelector('.salespop-low-stock-icon');
    if (!iconEl) {
      iconEl = alert.querySelector('.salespop-low-stock-icon') || document.createElement('span');
      iconEl.className = 'salespop-low-stock-icon';
      quantityRow.insertBefore(iconEl, quantityRow.firstChild);
    }
    Object.assign(iconEl.style, {
      width: '20px',
      height: '20px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#d72c0d',
      flexShrink: '0',
    });
    iconEl.innerHTML = renderIcon(settings.icon || 'warning');

    const quantityEl = ensureElement(
      quantityRow,
      '.salespop-low-stock-quantity',
      'salespop-low-stock-quantity',
      quantityTextStyles
    );
    const productNameEl = ensureElement(
      detailsContainer,
      '.salespop-low-stock-product-name',
      'salespop-low-stock-product-name',
      nameStyles,
      quantityRow
    );

    const selectedProduct = productData.product;
    const selectedVariant = productData.variant;
    const stockValue = productData.quantity;

    const imageUrl = selectedProduct.featuredImage || FALLBACK_IMAGE;
    if (productImageEl) {
      productImageEl.src = imageUrl;
    }

    if (productNameEl) {
      const variantTitle = selectedVariant?.title && selectedVariant.title !== 'Default Title'
        ? selectedVariant.title
        : '';
      productNameEl.textContent = `${selectedProduct.title}${variantTitle ? ` • ${variantTitle}` : ''}`;
    }

    if (quantityEl) {
      quantityEl.textContent = `${stockValue} in stock`;
    }

    if (messageEl) {
      const baseMessage = settings.customMessage || 'Hurry! Only {stock} left in stock.';
      const message = processMessage(baseMessage, stockValue);
      messageEl.textContent = message;
    }

    // Show/hide close button
    const closeBtn = alert.querySelector('.salespop-low-stock-close') || alert.querySelector('#salespop-low-stock-close');
    if (closeBtn) {
      if (settings.showCloseButton) {
        closeBtn.style.display = 'flex';
        closeBtn.addEventListener('click', hideAlert);
      } else {
        closeBtn.style.display = 'none';
      }
    }

    // Show container and alert
    container.style.display = 'block';
    alert.style.display = 'inline-flex';
    isAlertVisible = true;
    alertStartTime = Date.now();

    // Auto-hide after duration
    const showAlertFor = parseInt(settings.showAlertFor) || 0;
    if (showAlertFor > 0) {
      alertTimeout = setTimeout(() => {
        hideAlert();
      }, showAlertFor * 1000);
    }
  }

  function hideAlert() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    const alert = container.querySelector('.salespop-low-stock-alert');
    if (alert) {
      alert.style.display = 'none';
    }
    container.style.display = 'none';
    isAlertVisible = false;
    alertStartTime = null;

    if (alertTimeout) {
      clearTimeout(alertTimeout);
      alertTimeout = null;
    }
  }

  function getNextProductVariant() {
    if (!products || products.length === 0) {
      return null;
    }

    for (let i = 0; i < products.length; i++) {
      const product = products[productCursor];
      productCursor = (productCursor + 1) % products.length;

      const variants = product.variants || [];
      const availableVariants = variants.filter((variant) => {
        const qty = Number(variant.inventoryQuantity);
        return Number.isFinite(qty) && qty > 0;
      });

      const candidateVariants = availableVariants.length > 0 ? availableVariants : variants;
      if (!candidateVariants.length) {
        continue;
      }

      const variant = candidateVariants[Math.floor(Math.random() * candidateVariants.length)];
      const quantity = Number(variant.inventoryQuantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      return {
        product,
        variant,
        quantity,
      };
    }

    return null;
  }

  function checkAndShowAlert() {
    if (!settings) {
      console.warn('[Low Stock Alert] Settings not loaded');
      return;
    }

    // Check if we should show on this page
    if (!shouldShowOnPage(settings)) {
      return;
    }

    const nextProduct = getNextProductVariant();
    if (!nextProduct) {
      console.warn('[Low Stock Alert] No product variants available to display');
      return;
    }

    showAlert(settings, nextProduct);
  }

  function scheduleAlerts() {
    // Clear any existing intervals
    if (alertInterval) {
      clearInterval(alertInterval);
      alertInterval = null;
    }

    if (!settings) return;
    if (!products || products.length === 0) {
      console.warn('[Low Stock Alert] No products returned from API');
      return;
    }

    const timeBeforeFirstAlert = parseInt(settings.timeBeforeFirstAlert) || 0;
    const gapBetweenAlerts = parseInt(settings.gapBetweenAlerts) || 0;

    // Initial delay before first alert
    if (timeBeforeFirstAlert > 0) {
      setTimeout(() => {
        checkAndShowAlert();
        
        // Schedule recurring alerts if gap is set
        if (gapBetweenAlerts > 0) {
          alertInterval = setInterval(() => {
            if (!isAlertVisible) {
              checkAndShowAlert();
            }
          }, gapBetweenAlerts * 1000);
        }
      }, timeBeforeFirstAlert * 1000);
    } else {
      // Show immediately
      checkAndShowAlert();
      
      // Schedule recurring alerts if gap is set
      if (gapBetweenAlerts > 0) {
        alertInterval = setInterval(() => {
          if (!isAlertVisible) {
            checkAndShowAlert();
          }
        }, gapBetweenAlerts * 1000);
      }
    }
  }

  async function init() {
    console.log('[Low Stock Alert] Initializing...');

    // Fetch settings + product data
    const payload = await fetchCampaignData();
    if (!payload) {
      console.log('[Low Stock Alert] Settings not available or campaign disabled');
      return;
    }

    settings = payload.settings || {};
    products = Array.isArray(payload.products) ? payload.products : [];

    console.log('[Low Stock Alert] Settings loaded:', {
      hasSettings: !!settings,
      settingsKeys: Object.keys(settings),
      settings: settings,
      productsCount: products.length
    });

    // Check if we should show on this page
    if (!shouldShowOnPage(settings)) {
      console.log('[Low Stock Alert] Not configured to show on this page');
      return;
    }

    // Schedule alerts
    scheduleAlerts();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

