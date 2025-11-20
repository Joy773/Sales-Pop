(() => {
  if (window.SalesPopVisitorCountInitialized) {
    console.debug('[Visitor Count] Already initialized, skipping');
    return;
  }
  window.SalesPopVisitorCountInitialized = true;

  const CONTAINER_ID = 'salespop-visitor-count-container';
  const WIDGET_ID = 'salespop-visitor-count-widget';
  const PUBLIC_API_ENDPOINT = '/api/public/visitor-count';

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
        border:2px solid ${highlightColor}20;
        top:50%;left:50%;transform:translate(-50%, -50%);
        animation: visitor-glow-outer 2s ease-in-out infinite;
      "></div>
      <div style="
        position:absolute;width:18px;height:18px;border-radius:50%;
        border:2px solid ${highlightColor}50;
        top:50%;left:50%;transform:translate(-50%, -50%);
        animation: visitor-glow-middle 2s ease-in-out infinite;
      "></div>
      <div style="
        position:absolute;width:12px;height:12px;border-radius:50%;
        background:${highlightColor};
        top:50%;left:50%;transform:translate(-50%, -50%);
        animation: visitor-glow-inner 2s ease-in-out infinite;
      "></div>
    `;

    const textWrapper = document.createElement('div');
    textWrapper.style.display = 'flex';
    textWrapper.style.flexDirection = 'column';
    textWrapper.style.gap = '2px';

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
    closeButton.style.right = '8px';
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
  }

  async function fetchVisitorData(shop, appUrl) {
    const params = new URLSearchParams();
    params.set('shop', shop);

    const publicUrl = appUrl
      ? `${appUrl.replace(/\/$/, '')}${PUBLIC_API_ENDPOINT}?${params.toString()}`
      : null;

    if (!publicUrl) {
      console.warn('[Visitor Count] Public API URL unavailable, aborting fetch');
      return { data: null, source: 'unavailable' };
    }

    try {
      const publicResponse = await fetch(publicUrl, { mode: 'cors', credentials: 'omit' });
      if (!publicResponse.ok) {
        throw new Error(`Public API returned ${publicResponse.status}`);
      }
      const data = await publicResponse.json();
      console.debug('[Visitor Count] ✓ Loaded data via public API', data);
      return { data, source: 'public_api' };
    } catch (publicError) {
      console.error('[Visitor Count] ✗ Failed to load visitor data from public API:', publicError.message);
      return { data: null, source: 'error', error: publicError };
    }
  }

  async function init() {
    const shop = getShop();
    if (!shop) {
      console.warn('[Visitor Count] Shop domain missing, aborting initialization');
      return;
    }

    const appUrl = getAppBaseUrl();
    if (appUrl) {
      console.debug('[Visitor Count] App base URL detected:', appUrl);
    } else {
      console.warn('[Visitor Count] App base URL missing, ensure metafield or global variable is set');
    }

    const container = createContainer();
    const widget = createWidget(container);

    container.style.display = 'block';

    const { data, source } = await fetchVisitorData(shop, appUrl);
    if (!data || !data.success) {
      console.warn('[Visitor Count] No visitor data returned, hiding widget');
      hideWidget();
      return;
    }

    const settings = normalizeSettings(data.settings || {});
    const visitor = data.visitor || data.count || { count: 0 };

    console.debug('[Visitor Count] Loaded payload', { settings, visitor, source });

    if (!shouldDisplayOnPage(settings)) {
      console.debug('[Visitor Count] Widget disabled for this page based on settings');
      hideWidget();
      return;
    }

    applyStyles(widget, settings);
    renderContent(widget, settings, visitor);

    const delayMs = Number(settings.delayBeforeFirstPop) * 1000;
    showWidget(widget, Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 0);

    if (settings.popupDuration) {
      const durationMs = Number(settings.popupDuration) * 1000;
      if (!Number.isNaN(durationMs) && durationMs > 0) {
        setTimeout(() => {
          hideWidget();
        }, durationMs);
      }
    }
  }

  function bootstrap() {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      init();
    } else {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    }
  }

  bootstrap();
})();

