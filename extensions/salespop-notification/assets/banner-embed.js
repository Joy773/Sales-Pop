(() => {
  const ROOT_ID = 'salespop-banner-root';
  const API_PATH = '/api/public/banner-pop';
  const SUBSCRIBE_PATH = '/api/public/banner-pop/subscribe';

  function normalizeShopDomain(shop) {
    if (!shop || typeof shop !== 'string') {
      return null;
    }
    return shop.trim().toLowerCase().replace(/^https?:\/\//, '');
  }

  function resolveShopDomain() {
    const candidates = [
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
    console.warn('[Banner Embed] Unable to determine shop domain');
    return null;
  }

  function resolveAppOrigin() {
    console.log('[Banner Embed] Resolving app origin...');
    console.log('[Banner Embed] window.SalesPopBannerAppUrl:', window.SalesPopBannerAppUrl);
    
    const metaTag = document.querySelector('meta[name="salespop-app-url"]');
    console.log('[Banner Embed] Meta tag:', metaTag?.content);
    
    const configured =
      window.SalesPopBannerAppUrl ||
      metaTag?.content;
    
    if (configured) {
      const cleaned = configured.replace(/\/$/, '');
      console.log('[Banner Embed] Using configured app origin:', cleaned);
      return cleaned;
    }
    
    console.log('[Banner Embed] No configured app URL found, trying script detection...');

    const scriptCandidates = [
      document.currentScript,
      ...Array.from(
        document.querySelectorAll('script[src*="banner-embed.js"]')
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
          console.warn('[Banner Embed] Failed to parse script src', script.src, error);
        }
      }
    }

    const devHostPattern = /(localhost|127\.0\.0\.1|ngrok\.io|trycloudflare\.com|cloudflare\.com)$/;
    if (devHostPattern.test(window.location.hostname)) {
      const devOrigin = `${window.location.protocol}//${window.location.host}`.replace(/\/$/, '');
      console.log('[Banner Embed] Using dev origin (detected from hostname):', devOrigin);
      return devOrigin;
    }

    console.warn('[Banner Embed] Unable to determine app origin');
    console.warn('[Banner Embed] Please set window.SalesPopBannerAppUrl or meta[name="salespop-app-url"]');
    return null;
  }

  const STYLE_ID = 'salespop-banner-styles';
  const DEFAULT_IMAGE =
    'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';
  const TEMPLATE_MAP = {
    'template-1': {
      background: '#F4F7FB',
      accent: '#E3E8F4',
      title: '#0F172A',
      subtitle: '#475569',
      cta: '#0F766E',
    },
    'template-2': {
      background: '#FBF5FF',
      accent: '#E9D5FF',
      title: '#581C87',
      subtitle: '#7E22CE',
      cta: '#A855F7',
    },
    'template-3': {
      background: '#FFF3EA',
      accent: '#FED7AA',
      title: '#7C2D12',
      subtitle: '#9A3412',
      cta: '#F97316',
    },
    'template-4': {
      background: '#F1FFF4',
      accent: '#BBF7D0',
      title: '#14532D',
      subtitle: '#166534',
      cta: '#10B981',
    },
    'template-5': {
      background: '#FDF2F8',
      accent: '#FBCFE8',
      title: '#831843',
      subtitle: '#9D174D',
      cta: '#DB2777',
    },
  };

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} .salespop-banner-container {
        animation: salespop-banner-fade-in 240ms ease-out;
      }

      #${ROOT_ID} .salespop-banner-wrapper {
        width: min(90vw, 880px);
        transition: opacity 200ms ease;
      }

      #${ROOT_ID} .salespop-banner-hide {
        animation: salespop-banner-fade-out 240ms ease-in forwards;
      }

      @keyframes salespop-banner-fade-in {
        from {
          opacity: 0;
          transform: translate3d(0, 12px, 0);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }

      @keyframes salespop-banner-fade-out {
        to {
          opacity: 0;
          transform: translate3d(0, 12px, 0);
        }
      }

      @media (max-width: 640px) {
        #${ROOT_ID} .salespop-banner-wrapper {
          width: calc(100vw - 24px);
          right: 12px !important;
          left: 12px !important;
          margin: 0 auto;
        }

        #${ROOT_ID} .salespop-banner-grid {
          grid-template-columns: 1fr !important;
        }

        #${ROOT_ID} .salespop-banner-content {
          padding: 32px 20px !important;
        }

        #${ROOT_ID} .salespop-banner-container[data-layout] {
          height: auto !important;
          min-height: 500px !important;
          max-height: 85vh !important;
        }

        #${ROOT_ID} .salespop-banner-wrapper[data-has-layout] {
          width: calc(100vw - 16px) !important;
          max-height: 90vh !important;
        }

        #${ROOT_ID} .salespop-banner-container[data-layout] img[alt="Banner background"] {
          object-fit: cover;
          min-height: 500px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const DEFAULT_DURATION_SECONDS = 10;

  function hideBanner(root) {
    const wrapper = root.querySelector('.salespop-banner-wrapper');
    if (!wrapper) return;

    wrapper.classList.add('salespop-banner-hide');
    wrapper.addEventListener(
      'animationend',
      () => {
        if (root.contains(wrapper)) {
          root.innerHTML = '';
        }
      },
      { once: true }
    );
  }

  function scheduleAutoHide(root, styles) {
    const durationSeconds = Number(styles?.popupDuration) || DEFAULT_DURATION_SECONDS;
    const duration = Math.max(durationSeconds, 1) * 1000;
    window.setTimeout(() => hideBanner(root), duration);
  }

  async function submitContact(contactValue, subscriptionType, settings) {
    const trimmed = (contactValue || '').trim();
    if (!trimmed) {
      throw new Error('Missing contact value');
    }

    const appOrigin = resolveAppOrigin();
    if (!appOrigin) {
      throw new Error('Missing app origin');
    }

    const url = new URL(SUBSCRIBE_PATH, appOrigin);
    const shop = resolveShopDomain();
    if (shop) {
      url.searchParams.set('shop', shop);
    }

    const sameOrigin = appOrigin === window.location.origin;
    const formData = new FormData();
    if (shop) {
      formData.append('shop', shop);
    }
    formData.append('subscriptionType', subscriptionType);
    formData.append('contact', trimmed);
    formData.append('goal', JSON.stringify(settings.goal || {}));
    formData.append('styles', JSON.stringify(settings.styles || {}));

    const response = await fetch(url.toString(), {
      method: 'POST',
      credentials: sameOrigin ? 'include' : 'omit',
      mode: sameOrigin ? 'same-origin' : 'cors',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Subscription request failed with status ${response.status}${
          errorText ? `: ${errorText.substring(0, 200)}` : ''
        }`,
      );
    }

    const result = await response
      .json()
      .catch(() => ({ success: true }));

    if (result && result.success === false) {
      throw new Error(result.error || 'Subscription failed');
    }

    return result;
  }

  function ensureRoot() {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      console.log('[Banner Embed] Root element not found, creating new one');
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.appendChild(root);
      console.log('[Banner Embed] Root element created and appended to body');
    }
    root.style.display = 'block';
    console.log('[Banner Embed] Root element ensured, display:', root.style.display);
    return root;
  }

  async function fetchSettings() {
    console.log('Banner Embed: Fetching settings');
    try {
      const appOrigin = resolveAppOrigin();
      if (!appOrigin) {
        console.warn('[Banner Embed] Missing app origin; cannot fetch settings');
        return null;
      }

      const shop = resolveShopDomain();
      const url = new URL(API_PATH, appOrigin);
      if (shop) {
        url.searchParams.set('shop', shop);
      }
      const sameOrigin = appOrigin === window.location.origin;
      console.debug('[Banner Embed] Fetching settings from:', {
        appOrigin,
        requestUrl: url.toString(),
        shop,
        sameOrigin,
      });
      console.log('[Banner Embed] Making fetch request to:', url.toString());
      console.log('[Banner Embed] Fetch options:', {
        credentials: sameOrigin ? 'include' : 'omit',
        mode: sameOrigin ? 'same-origin' : 'cors',
      });
      
      const response = await fetch(url.toString(), {
        credentials: sameOrigin ? 'include' : 'omit',
        mode: sameOrigin ? 'same-origin' : 'cors',
        headers: {
          'Accept': 'application/json',
        },
      }).catch((fetchError) => {
        console.error('[Banner Embed] Fetch error details:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack,
        });
        throw new Error(`Network error: ${fetchError.message}. Check if the app URL is correct: ${appOrigin}`);
      });
      
      console.log('[Banner Embed] Response status:', response.status, response.statusText);
      console.log('[Banner Embed] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('[Banner Embed] Response error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`Request failed with status ${response.status}: ${errorText.substring(0, 200)}`);
      }
      
      const payload = await response.json().catch((jsonError) => {
        console.error('[Banner Embed] JSON parse error:', jsonError);
        throw new Error('Failed to parse response as JSON');
      });
      
      console.log('[Banner Embed] Received payload:', payload);
      if (!payload.success) {
        console.error('[Banner Embed] API returned success: false', payload.error);
        throw new Error(payload.error || 'Failed to load settings');
      }
      // Check if campaign is disabled
      if (payload.enabled === false) {
        console.log('[Banner Embed] Campaign is disabled');
        return null;
      }
      console.log('[Banner Embed] Settings loaded successfully:', payload.settings);
      console.log('[Banner Embed] Layout settings:', payload.settings?.layouts);
      return payload.settings;
    } catch (error) {
      console.error('[Banner Embed] Failed to fetch settings:', error);
      console.error('[Banner Embed] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500),
      });
      
      // Log helpful debugging info
      const appOrigin = resolveAppOrigin();
      const shop = resolveShopDomain();
      console.error('[Banner Embed] Debugging info:', {
        appOrigin,
        shop,
        currentOrigin: window.location.origin,
        apiPath: API_PATH,
        fullUrl: appOrigin ? `${appOrigin}${API_PATH}?shop=${shop || ''}` : 'N/A',
      });
      
      return null;
    }
  }

  function renderLayoutTemplate(root, settings) {
    console.log('[Banner Embed] Rendering layout template with settings:', settings);
    console.log('[Banner Embed] Settings keys:', Object.keys(settings || {}));
    console.log('[Banner Embed] Settings.layouts:', settings?.layouts);
    
    const { layouts = {} } = settings;
    console.log('[Banner Embed] Extracted layouts object:', layouts);
    console.log('[Banner Embed] Layouts keys:', Object.keys(layouts));
    
    const selectedLayout = layouts.selectedLayout || 'layout-1';
    console.log('[Banner Embed] Selected layout:', selectedLayout);
    const appOrigin = resolveAppOrigin();
    
    // Get background image URL - for layout-1, use layouts.imageUrl if provided, otherwise fallback
    let backgroundImageUrl = '';
    if (selectedLayout === 'layout-1') {
      // For layout-1, use layouts.imageUrl as the background image if provided,
      // otherwise fallback to styles.backgroundImageUrl or hardcoded Layout_One.png
      if (layouts.imageUrl) {
        backgroundImageUrl = layouts.imageUrl;
      } else if (settings.styles?.backgroundImageUrl) {
        backgroundImageUrl = settings.styles.backgroundImageUrl;
      } else {
        // Fallback to Layout_One.png if no image is provided
        backgroundImageUrl = appOrigin 
          ? `${appOrigin}/Layout_One.png`
          : '/Layout_One.png';
      }
    }

    console.log('[Banner Embed] Background image URL:', backgroundImageUrl);
    ensureStyles();

    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    // Log raw data before escaping
    console.log('[Banner Embed] Raw layout data from database:', {
      rawTitle1: layouts.title1,
      rawDiscount: layouts.discountPercentage,
      rawDescription: layouts.description,
      rawButtonText: layouts.buttonText,
      rawButtonUrl: layouts.buttonUrl,
      rawDisclaimer: layouts.disclaimer,
      rawTitleSize: layouts.titleSize,
      fullLayouts: layouts
    });

    // Extract values and log them
    const rawTitle1 = layouts.title1;
    const rawDiscount = layouts.discountPercentage;
    const rawDescription = layouts.description;
    const rawButtonText = layouts.buttonText;
    const rawDisclaimer = layouts.disclaimer;
    
    console.log('[Banner Embed] Extracted raw values:', {
      rawTitle1,
      rawDiscount,
      rawDescription,
      rawButtonText,
      rawDisclaimer,
      titleSize: layouts.titleSize
    });
    
    // Only use values if they exist and are not empty
    const title1 = rawTitle1 ? escapeHtml(String(rawTitle1)) : '';
    const discountPercentage = rawDiscount ? escapeHtml(String(rawDiscount)) : '';
    const description = rawDescription ? escapeHtml(String(rawDescription)) : '';
    const buttonText = rawButtonText ? escapeHtml(String(rawButtonText)) : '';
    const buttonUrl = layouts.buttonUrl || '';
    const titleSize = layouts.titleSize || '20';
    const title1Color = layouts.title1Color || '#FFFFFF';
    const discountColor = layouts.discountColor || '#FFFFFF';
    const descriptionColor = layouts.descriptionColor || '#F9E3D7';
    const buttonColor = layouts.buttonColor || '#D4A574';
    const disclaimerColor = layouts.disclaimerColor || '#2B1A11';
    const disclaimer = rawDisclaimer ? escapeHtml(String(rawDisclaimer)) : '';

    // Render Layout 1 - render even if minimal content
    if (selectedLayout === 'layout-1') {
      console.log('[Banner Embed] Rendering layout-1 with escaped data:', {
        title1,
        discountPercentage,
        description,
        buttonText,
        buttonUrl,
        disclaimer,
        backgroundImageUrl,
        hasTitle1: !!title1,
        hasDiscount: !!discountPercentage,
        hasDescription: !!description,
        hasButton: !!buttonText
      });
      
      root.innerHTML = `
        <div class="salespop-banner-wrapper" style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9999;
          width: 535px;
          border-radius: 20px;
          overflow: hidden;
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
        ">
          <div class="salespop-banner-container" data-layout="${selectedLayout}" style="
            position: relative;
            width: 535px;
            height: 744px;
            border-radius: 20px;
            overflow: hidden;
          ">
            ${backgroundImageUrl ? `
              <img
                src="${backgroundImageUrl}"
                alt="Layout 1"
                style="
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  object-position: center;
                "
              />
            ` : `
              <div style="
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                position: absolute;
                top: 0;
                left: 0;
              "></div>
            `}
            <button type="button" class="salespop-banner-close" aria-label="Close banner" style="
              position: absolute;
              top: 16px;
              right: 16px;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: none;
              background: rgba(255, 255, 255, 0.9);
              color: #000;
              font-size: 20px;
              line-height: 1;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            ">
              ×
            </button>
            ${title1 ? `
              <div style="
                position: absolute;
                top: 100px;
                left: 50%;
                transform: translateX(-50%);
                text-align: center;
                font-family: serif;
                color: ${title1Color};
                font-size: ${titleSize}px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
                width: 100%;
                padding: 0 24px;
                z-index: 2;
              ">
                ${title1}
              </div>
            ` : ''}
            ${discountPercentage ? `
              <div style="
                position: absolute;
                top: 145px;
                left: 50%;
                transform: translateX(-50%);
                text-align: center;
                font-family: serif;
                color: ${discountColor};
                font-size: 72px;
                font-weight: 700;
                font-style: italic;
                line-height: 1;
                width: 100%;
                padding: 0 24px;
                z-index: 2;
              ">
                ${discountPercentage}
              </div>
            ` : ''}
            ${description ? `
              <div style="
                position: absolute;
                top: 220px;
                left: 50%;
                transform: translateX(-50%);
                text-align: center;
                font-family: Georgia, 'Times New Roman', serif;
                color: ${descriptionColor};
                font-size: ${titleSize || '18'}px;
                font-weight: 400;
                line-height: 1.5;
                width: 100%;
                padding: 0 24px;
                max-width: 600px;
                word-wrap: break-word;
                z-index: 2;
              ">
                ${description}
              </div>
            ` : ''}
            ${buttonText ? `
              <button type="button" class="salespop-layout-button" style="
                position: absolute;
                top: 340px;
                left: 50%;
                transform: translateX(-50%);
                background-color: ${buttonColor};
                color: #FFFFFF;
                border: none;
                border-radius: 8px;
                padding: 14px 24px;
                font-family: sans-serif;
                font-size: 16px;
                font-weight: 600;
                text-transform: uppercase;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                white-space: nowrap;
                z-index: 2;
                transition: all 0.2s ease;
              ">
                ${buttonText}
                <span style="font-size: 18px;">→</span>
              </button>
            ` : ''}
            ${disclaimer ? `
              <div style="
                position: absolute;
                bottom: 40px;
                left: 50%;
                transform: translateX(-50%);
                text-align: center;
                font-family: Georgia, 'Times New Roman', serif;
                color: ${disclaimerColor};
                font-size: 14px;
                line-height: 1.4;
                width: 90%;
                max-width: 640px;
                opacity: 0.9;
                word-break: break-word;
                z-index: 2;
              ">
                <span style="font-weight: 600; margin-right: 6px; color: ${disclaimerColor};">Disclaimer:</span>
                <span style="font-weight: 400;">${disclaimer}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // Add close button handler
      const closeBtn = root.querySelector('.salespop-banner-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => hideBanner(root));
      }

      // Add button click handler
      const layoutButton = root.querySelector('.salespop-layout-button');
      if (layoutButton && buttonUrl) {
        layoutButton.addEventListener('click', () => {
          window.location.href = buttonUrl;
        });
        layoutButton.addEventListener('mouseenter', () => {
          layoutButton.style.opacity = '0.9';
          layoutButton.style.transform = 'translateX(-50%) scale(1.05)';
        });
        layoutButton.addEventListener('mouseleave', () => {
          layoutButton.style.opacity = '1';
          layoutButton.style.transform = 'translateX(-50%) scale(1)';
        });
      }

      // No auto-hide for layout-1 - banner stays until close button is clicked
      // Removed scheduleAutoHide call - banner will only close when user clicks the close button

      console.log('[Banner Embed] Layout-1 rendered successfully. Root visible:', root.style.display);
      console.log('[Banner Embed] Root element in DOM:', document.body.contains(root));
      
      // Ensure root is visible
      if (root.style.display === 'none') {
        root.style.display = 'block';
        console.log('[Banner Embed] Root was hidden, set to block');
      }
      
      return true; // Layout rendered successfully
    }

    // Layout 2 and 3 can be added here in the future
    // For now, return false to fall back to template rendering
    console.log('[Banner Embed] Layout template not supported, falling back to template rendering');
    return false;
  }

  function render(root, settings) {
    console.log('[Banner Embed] Render called with settings:', settings);
    if (!settings) {
      console.warn('[Banner Embed] No settings provided, clearing root');
      root.innerHTML = '';
      return;
    }

    // Check if layout template should be rendered
    console.log('[Banner Embed] Checking for layout template:', settings.layouts?.selectedLayout);
    if (settings.layouts?.selectedLayout && 
        ['layout-1', 'layout-2', 'layout-3'].includes(settings.layouts.selectedLayout)) {
      console.log('[Banner Embed] Layout template detected, attempting to render');
      const layoutRendered = renderLayoutTemplate(root, settings);
      if (layoutRendered) {
        console.log('[Banner Embed] Layout template rendered successfully');
        return; // Layout template rendered successfully
      }
      console.warn('[Banner Embed] Layout template rendering failed, falling back to template rendering');
      // If layout rendering fails, fall through to template rendering
    } else {
      console.log('[Banner Embed] No layout template or not supported, using template-based rendering');
    }

    const { goal = {}, styles = {}, countdown = {} } = settings;

    const templateId = styles.selectedTemplate || 'template-1';
    const template = TEMPLATE_MAP[templateId] || TEMPLATE_MAP['template-1'];
    const layout = styles.popoutLayout?.[0] || 'image-left';
    const popupSelection = goal.popupSelection?.[0];
    // Always use email (phone support removed)
    const subscriptionType = 'email';
    const shouldShowContactInput =
      popupSelection === 'collect-email' || popupSelection === 'subscribe-discount';
    const contactInputType = 'email'; // Always email input type
    // Always use 'Your email' - phone support completely removed
    const contactPlaceholder = 'Your email';
    const discountCode = (goal.discountCode || '').trim();
    const backgroundImageUrl = (styles.backgroundImageUrl || '').trim();
    const imageUrl = backgroundImageUrl || DEFAULT_IMAGE;

    const isCountdownEnabled = Boolean(countdown.isCountdownEnabled);
    const countdownItems = [
      {
        label: countdown.daysLabel || 'Days',
        value:
          countdown.countdownType?.[0] === 'loop-interval'
            ? countdown.loopIntervalDays || '0'
            : '09',
      },
      {
        label: countdown.hoursLabel || 'Hours',
        value:
          countdown.countdownType?.[0] === 'loop-interval'
            ? countdown.loopIntervalHours || '0'
            : '12',
      },
      {
        label: countdown.minutesLabel || 'Mins',
        value:
          countdown.countdownType?.[0] === 'loop-interval'
            ? countdown.loopIntervalMinutes || '0'
            : '32',
      },
      {
        label: countdown.secondsLabel || 'Secs',
        value: countdown.loopIntervalSeconds || '18',
      },
    ];

    const formattedEndDate =
      countdown.countdownType?.[0] === 'specific-end-date'
        ? (() => {
            const date = countdown.countdownEndDate
              ? new Date(countdown.countdownEndDate)
              : null;
            return date && !Number.isNaN(date.getTime())
              ? date.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '';
          })()
        : '';

    ensureStyles();

    const imageSection =
      layout === 'no-image'
        ? ''
        : `
          <div class="salespop-banner-image" style="
            order: ${layout === 'image-left' ? 0 : 1};
            position: relative;
            min-height: 360px;
            height: 100%;
            overflow: hidden;
            background-color: #F9FAFB;
          ">
            <img
              src="${imageUrl}"
              alt="Banner visual"
              style="width: 100%; height: 100%; object-fit: cover;"
            />
          </div>
        `;

    const discountMarkup =
      (popupSelection === 'offer-discount' || popupSelection === 'subscribe-discount') &&
      discountCode
        ? `
            <div class="salespop-discount-code" data-code="${discountCode}" style="
              margin-top: 8px;
              padding: 10px 16px;
              border-radius: 12px;
              background: linear-gradient(120deg, rgba(34,197,94,0.12), rgba(59,130,246,0.12));
              border: 1px solid rgba(34, 197, 94, 0.25);
              font-weight: 600;
              color: #064e3b;
              display: inline-flex;
              align-items: center;
              gap: 4px;
              cursor: pointer;
              transition: all 0.2s ease;
              user-select: none;
            ">
              <span class="salespop-discount-label">Code:</span>
              <span style="font-family: monospace; letter-spacing: 0.05em;">
                ${discountCode}
              </span>
            </div>
          `
        : '';

    const ctaLabel = goal.buttonText || 'Join now';
    const submittingText = goal.buttonSubmittingText || 'Submitting...';
    const successButtonText = goal.buttonSuccessText || 'Joined!';
    const successMessage =
      goal.successMessage || 'Thanks for subscribing! Please check your inbox.';
    const errorMessage =
      goal.errorMessage || 'Something went wrong. Please try again.';
    const validationMessage =
      goal.validationMessage || 'Please enter a valid email address.';

    const ctaButtonStyle = `
      background-color: ${template.cta};
      border: none;
      border-radius: 999px;
      padding: 12px 28px;
      color: #ffffff;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
      box-shadow: 0 12px 24px rgba(16, 185, 129, 0.25);
    `;

    const formMarkup = shouldShowContactInput
      ? `
          <form class="salespop-banner-form" novalidate style="
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
            max-width: 360px;
            ">
            <div style="
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              width: 100%;
            ">
              <input
                type="${contactInputType}"
                name="contact"
                autocomplete="email"
                placeholder="${contactPlaceholder}"
                required
                style="
                  flex: 1 1 200px;
                  min-width: 180px;
                  padding: 12px 16px;
                  border-radius: 12px;
                  border: 1px solid rgba(15, 118, 110, 0.18);
                  background-color: rgba(255, 255, 255, 0.85);
                  box-shadow: inset 0 1px 2px rgba(15, 118, 110, 0.08);
                  font-size: 14px;
                  color: #111827;
                "
              />
              <button type="submit" class="salespop-banner-submit" style="
                flex: 0 0 auto;
                ${ctaButtonStyle}
              ">
                ${ctaLabel}
              </button>
            </div>
            <p class="salespop-banner-feedback" style="
              display: none;
              font-size: 14px;
              margin: 0;
              color: ${template.subtitle};
            "></p>
          </form>
        `
      : '';

    const buttonMarkup = shouldShowContactInput
      ? ''
      : `
          <button class="salespop-banner-cta" style="
            align-self: flex-start;
            ${ctaButtonStyle}
          ">
            ${ctaLabel}
          </button>
        `;

    const countdownMarkup =
      isCountdownEnabled
        ? `
            <div style="
              margin-top: 24px;
              display: grid;
              grid-template-columns: repeat(${countdownItems.length}, minmax(0, 1fr));
              gap: 12px;
              width: 100%;
            ">
              ${countdownItems
                .map(
                  (item) => `
                    <div style="
                      background-color: rgba(255, 255, 255, 0.28);
                      border-radius: 12px;
                      padding: 10px 14px;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      color: ${template.title};
                      backdrop-filter: blur(4px);
                    ">
                      <div style="font-size: 20px; font-weight: 700;">${item.value}</div>
                      <div style="font-size: 12px; opacity: 0.75;">${item.label}</div>
                    </div>
                  `
                )
                .join('')}
              ${
                formattedEndDate
                  ? `
                    <div style="
                      grid-column: span ${countdownItems.length};
                      background-color: rgba(255, 255, 255, 0.18);
                      border-radius: 12px;
                      padding: 12px 16px;
                      text-align: center;
                      color: ${template.title};
                      font-size: 12px;
                      display: flex;
                      flex-direction: column;
                      gap: 4px;
                    ">
                      <span>Ends on <strong>${formattedEndDate}</strong></span>
                    </div>
                  `
                  : ''
              }
            </div>
          `
        : '';

    root.innerHTML = `
      <div class="salespop-banner-wrapper" style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
        font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      ">
        <div class="salespop-banner-container" style="
          background: linear-gradient(135deg, ${template.background}, ${template.accent});
        ">
          <div class="salespop-banner-grid" style="
            display: grid;
            grid-template-columns: ${layout === 'no-image' ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))'};
            min-height: 360px;
            align-items: stretch;
          ">
            ${layout === 'image-left' ? imageSection : ''}
            <div class="salespop-banner-content" style="
              display: flex;
              flex-direction: column;
              gap: 16px;
              padding: 48px;
              position: relative;
              justify-content: center;
              color: ${template.title};
              background: ${
                layout === 'no-image'
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.6))'
                  : 'linear-gradient(140deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.55))'
              };
            ">
              <button type="button" class="salespop-banner-close" aria-label="Close banner" style="
                position: absolute;
                top: 16px;
                right: 16px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: none;
                background: rgba(15, 23, 42, 0.12);
                color: ${template.title};
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                ×
              </button>
              <h3 style="
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                line-height: 1.2;
              ">
            ${goal.popupTitle || 'Welcome to our store'}
          </h3>
              <p style="
                margin: 0;
                font-size: 16px;
                line-height: 1.6;
                color: ${template.subtitle};
                max-width: 28rem;
              ">
                ${
                  goal.popupDescription ||
                  'Share a short message to encourage shoppers to subscribe.'
                }
          </p>
              ${formMarkup}
          ${discountMarkup}
              ${buttonMarkup}
              ${countdownMarkup}
            </div>
            ${layout === 'image-right' ? imageSection : ''}
          </div>
        </div>
      </div>
    `;

    const closeBtn = root.querySelector('.salespop-banner-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => hideBanner(root));
    }

    // Add click-to-copy functionality for discount code
    const discountCodeEl = root.querySelector('.salespop-discount-code');
    if (discountCodeEl) {
      const codeValue = discountCodeEl.getAttribute('data-code');
      const labelEl = discountCodeEl.querySelector('.salespop-discount-label');
      let copyTimeout = null;

      discountCodeEl.addEventListener('click', async () => {
        if (!codeValue) return;

        try {
          await navigator.clipboard.writeText(codeValue);
          
          // Show "Copied!" feedback
          if (labelEl) {
            const originalText = labelEl.textContent;
            labelEl.textContent = 'Copied!';
            
            if (copyTimeout) {
              clearTimeout(copyTimeout);
            }
            copyTimeout = setTimeout(() => {
              if (labelEl) {
                labelEl.textContent = originalText;
              }
            }, 2000);
          }
        } catch (error) {
          console.error('[Banner Embed] Failed to copy discount code:', error);
        }
      });

      // Add hover effects
      discountCodeEl.addEventListener('mouseenter', () => {
        discountCodeEl.style.opacity = '0.9';
        discountCodeEl.style.transform = 'scale(1.02)';
      });

      discountCodeEl.addEventListener('mouseleave', () => {
        discountCodeEl.style.opacity = '1';
        discountCodeEl.style.transform = 'scale(1)';
      });
    }

    if (shouldShowContactInput) {
      const form = root.querySelector('.salespop-banner-form');
      const input = form?.querySelector('input[name="contact"]');
      const submitBtn = form?.querySelector('.salespop-banner-submit');
      const feedback = form?.querySelector('.salespop-banner-feedback');

      if (form && input && submitBtn && feedback) {
        form.addEventListener('submit', async (event) => {
          event.preventDefault();

          const value = input.value.trim();
          if (!value) {
            feedback.textContent = validationMessage;
            feedback.style.color = '#be123c';
            feedback.style.display = 'block';
            input.focus();
            return;
          }

          if (contactInputType === 'email') {
            const emailPattern =
              /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
            if (!emailPattern.test(value)) {
              feedback.textContent = validationMessage;
              feedback.style.color = '#be123c';
              feedback.style.display = 'block';
              input.focus();
              return;
            }
          }

          submitBtn.disabled = true;
          submitBtn.textContent = submittingText;
          feedback.style.display = 'none';

          try {
            // Always send as email subscription (phone support removed)
            const result = await submitContact(value, 'email', settings);

            const message =
              result?.successMessage || successMessage;
            feedback.textContent = message;
            feedback.style.color = '#15803d';
            feedback.style.display = 'block';
            submitBtn.textContent = successButtonText;
            form.reset();

            window.setTimeout(() => {
              hideBanner(root);
            }, 2000);
          } catch (error) {
            console.error('[Banner Embed] Failed to submit contact:', error);
            feedback.textContent = error?.message
              ? `${errorMessage} (${error.message})`
              : errorMessage;
            feedback.style.color = '#be123c';
            feedback.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = ctaLabel;
          }
        });
      }
    } else {
      scheduleAutoHide(root, styles);
    }
  }

  function shouldShowBanner(settings) {
    console.log('[Banner Embed] shouldShowBanner called with settings:', settings);
    
    // If using layout templates, check layouts for display settings first
    if (settings.layouts?.selectedLayout) {
      // For layouts, check if there's a displayOnPage in goal, otherwise default to all-page
      if (!settings.goal || !settings.goal.displayOnPage) {
        console.log('[Banner Embed] Layout template with no displayOnPage setting, showing on all pages');
        return true;
      }
    }
    
    if (!settings || !settings.goal) {
      console.log('[Banner Embed] No settings or goal, defaulting to show on all pages');
      return true; // Default: show on all pages if no settings
    }

    const displayOnPage = settings.goal.displayOnPage || 'all-page';
    const currentPath = window.location.pathname;

    // Normalize paths (remove trailing slashes for comparison)
    const normalizePath = (path) => {
      if (!path) return '';
      // If it's a full URL, extract the pathname
      try {
        // Check if it's a full URL (starts with http:// or https://)
        if (path.startsWith('http://') || path.startsWith('https://')) {
          const url = new URL(path);
          path = url.pathname;
        }
        // If it doesn't start with /, add it
        if (path && !path.startsWith('/')) {
          path = '/' + path;
        }
      } catch (e) {
        // If URL parsing fails, treat it as a path
        if (path && !path.startsWith('/')) {
          path = '/' + path;
        }
      }
      // Remove trailing slashes (except for root)
      return path === '/' ? '/' : path.replace(/\/$/, '');
    };

    const normalizedCurrentPath = normalizePath(currentPath);

    console.log('[Banner Embed] Display check:', {
      displayOnPage,
      currentPath,
      normalizedCurrentPath,
      specificPageUrl: settings.goal.specificPageUrl,
    });

    if (displayOnPage === 'homepage') {
      // Show only on homepage
      const shouldShow = normalizedCurrentPath === '/' || normalizedCurrentPath === '/index';
      console.log('[Banner Embed] Homepage check:', shouldShow);
      return shouldShow;
    } else if (displayOnPage === 'specific-page') {
      // Show only on the specific page URL
      const specificPageUrl = (settings.goal.specificPageUrl || '').trim();
      if (!specificPageUrl) {
        console.log('[Banner Embed] Specific page: No URL specified');
        return false; // No URL specified, don't show
      }
      const normalizedSpecificPath = normalizePath(specificPageUrl);
      const shouldShow = normalizedCurrentPath === normalizedSpecificPath;
      console.log('[Banner Embed] Specific page check:', {
        specificPageUrl,
        normalizedSpecificPath,
        normalizedCurrentPath,
        shouldShow,
      });
      return shouldShow;
    } else if (displayOnPage === 'all-page') {
      // Show on all pages
      console.log('[Banner Embed] All pages: showing');
      return true;
    }

    // Default: show on all pages
    return true;
  }

  async function init() {
    console.log('[Banner Embed] Initializing banner embed...');
    const root = ensureRoot();
    console.log('[Banner Embed] Root element:', root);
    const settings = await fetchSettings();
    console.log('[Banner Embed] Fetched settings:', settings);
    
    // If settings is null, campaign is disabled
    if (!settings) {
      console.log('[Banner Embed] Campaign is disabled or settings are null, not rendering banner');
      root.innerHTML = '';
      return;
    }
    
    // Check if banner should be shown on this page
    const shouldShow = shouldShowBanner(settings);
    console.log('[Banner Embed] Should show banner:', shouldShow);
    if (!shouldShow) {
      console.log('[Banner Embed] Banner not shown on this page based on displayOnPage setting');
      root.innerHTML = '';
      return;
    }
    
    console.log('[Banner Embed] Calling render function...');
    render(root, settings);
    console.log('[Banner Embed] Render function completed. Root innerHTML length:', root.innerHTML.length);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

