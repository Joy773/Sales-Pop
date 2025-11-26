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
    const configured =
      window.SalesPopBannerAppUrl ||
      document.querySelector('meta[name="salespop-app-url"]')?.content;
    if (configured) {
      return configured.replace(/\/$/, '');
    }

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
      return `${window.location.protocol}//${window.location.host}`.replace(/\/$/, '');
    }

    console.warn('[Banner Embed] Unable to determine app origin');
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
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.appendChild(root);
    }
    root.style.display = 'block';
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
      const response = await fetch(url.toString(), {
        credentials: sameOrigin ? 'include' : 'omit',
        mode: sameOrigin ? 'same-origin' : 'cors',
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error || 'Failed to load settings');
      }
      // Check if campaign is disabled
      if (payload.enabled === false) {
        console.log('[Banner Embed] Campaign is disabled');
        return null;
      }
      return payload.settings;
    } catch (error) {
      console.error('[Banner Embed] Failed to fetch settings:', error);
      return null;
    }
  }

  function render(root, settings) {
    if (!settings) {
      root.innerHTML = '';
      return;
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
    if (!settings || !settings.goal) {
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
    const root = ensureRoot();
    const settings = await fetchSettings();
    
    // If settings is null, campaign is disabled
    if (!settings) {
      console.log('[Banner Embed] Campaign is disabled, not rendering banner');
      root.innerHTML = '';
      return;
    }
    
    // Check if banner should be shown on this page
    if (!shouldShowBanner(settings)) {
      console.log('[Banner Embed] Banner not shown on this page based on displayOnPage setting');
      root.innerHTML = '';
      return;
    }
    
    render(root, settings);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

