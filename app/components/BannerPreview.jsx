import {Card, Text, BlockStack} from '@shopify/polaris';
import {getTemplateById} from './bannerTemplates';
import {useState, useRef, useEffect} from 'react';

const DEFAULT_IMAGE =
  'https://marketplace.canva.com/EAGWX_Y528I/1/0/900w/canva-pink-and-beige-cute-aesthetic-background-your-story-7zvxj2T1VSk.jpg';

const LAYOUT_2_IMAGE =
  'https://cdn.thewirecutter.com/wp-content/media/2025/09/BEST-MENS-WHITE-TEES-SUB-2048px-5929.jpg?auto=webp&quality=75&width=1024';

const LAYOUT_3_IMAGE =
  'https://files.cdn.printful.com/o/upload/bfl-image/f5/10333_l_collage%20vintage%20design%20.jpg';

const LAYOUT_4_IMAGE =
  'https://static.vecteezy.com/system/resources/previews/002/453/548/non_2x/sale-discount-banner-template-promotion-illustration-free-vector.jpg';

export default function BannerPreview({settings}) {
  const {
    goal = {},
    styles = {},
    countdown = {},
    layouts = {},
  } = settings || {};
  const template = getTemplateById(styles.selectedTemplate);
  const layout = styles.popoutLayout?.[0] || 'image-left';
  const selectedLayout = layouts?.selectedLayout;
  const backgroundImageUrl = (styles.backgroundImageUrl ?? '').trim();
  const imageUrl = backgroundImageUrl || (selectedLayout === 'layout-2' ? LAYOUT_2_IMAGE : DEFAULT_IMAGE);

  const heading = goal.popupTitle || 'Welcome to our store';
  const description =
    goal.popupDescription ||
    'Share a short message to encourage shoppers to subscribe.';
  const buttonLabel = goal.buttonText || 'Join now';
  
  // Layout 1 fallback values
  const discountPercentage = layouts?.discountPercentage || '35%';
  const buttonText = layouts?.buttonText || 'SHOP NOW';
  const disclaimer = layouts?.disclaimer || 'Terms and conditions apply';
  
  // Layout 3 fallback values
  const layout3Text = layouts?.text || 'Special Offer';
  const layout3DiscountText = layouts?.discountText || '50';
  const layout3BrandName = layouts?.brandName || 'Your Brand';
  const layout3UrlName = layouts?.urlName || 'shopnow.com';
  const textSize = 16;
  const headingFontSize = 24;
  const popupSelection = goal.popupSelection?.[0];
  const shouldShowContactInput =
    popupSelection === 'collect-email' || popupSelection === 'subscribe-discount';
  const contactInputType = 'email';
  const contactPlaceholder = 'Your email address';
  const discountCode = goal.discountCode?.trim();

  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef(null);
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const handleCopyCode = async () => {
    if (!discountCode) return;

    try {
      await navigator.clipboard.writeText(discountCode);
      setCopied(true);
      
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Load Sour Gummy font from Google Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Sour+Gummy:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const containerStyle = {
    background: `linear-gradient(135deg, ${template.preview.background}, ${template.preview.accent})`,
    borderRadius: '20px',
    width: '100%',
    maxWidth: '880px',
    minHeight: '360px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 0,
    alignItems: 'stretch',
    justifyContent: 'center',
    boxShadow: '0 16px 40px rgba(15, 118, 110, 0.12)',
    overflow: 'hidden',
    padding: 0,
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formattedEndDate =
    countdown.countdownType?.[0] === 'specific-end-date'
      ? formatDate(countdown.countdownEndDate)
      : null;

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

  const countdownContent =
    countdown.isCountdownEnabled &&
      popupSelection !== 'announcement' &&
      popupSelection !== 'collect-email' ? (
      <div
        style={{
          marginTop: '24px',
          display: 'grid',
          gridTemplateColumns: `repeat(${countdownItems.length}, minmax(0, 1fr))`,
          gap: '12px',
          width: '100%',
        }}
      >
        {countdownItems.map((item) => (
          <div
            key={item.label}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.28)',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: template.preview.title,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div style={{fontSize: '20px', fontWeight: 700}}>{item.value}</div>
            <div style={{fontSize: '12px', opacity: 0.75}}>{item.label}</div>
          </div>
        ))}
        {formattedEndDate && (
          <div
            style={{
              gridColumn: `span ${countdownItems.length}`,
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              borderRadius: '12px',
              padding: '12px 16px',
              textAlign: 'center',
              color: template.preview.title,
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span>
              Ends on <strong>{formattedEndDate}</strong>
            </span>
          </div>
        )}
      </div>
    ) : null;

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '48px',
        justifyContent: 'center',
        color: template.preview.title,
        background:
          layout === 'no-image'
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.6))'
            : 'linear-gradient(140deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.55))',
        order: layout === 'image-left' ? 1 : 0,
        height: '100%',
        maxWidth: '100%',
        width: '100%',
      }}
    >
      <Text
        as="h3"
        variant="headingLg"
        style={{
          color: template.preview.title,
          fontWeight: 700,
          fontSize: `${headingFontSize}px`,
          lineHeight: 1.2,
        }}
      >
        {heading}
      </Text>
      <Text
        as="p"
        variant="bodyMd"
        style={{
          fontSize: `${textSize}px`,
          maxWidth: '28rem',
          lineHeight: 1.6,
          color: template.preview.subtitle,
        }}
      >
        {description}
      </Text>
      {shouldShowContactInput && !(popupSelection === 'subscribe-discount' && emailSubmitted) && (
        <>
          <input
            type={contactInputType}
            placeholder={contactPlaceholder}
            disabled
            style={{
              width: '100%',
              maxWidth: '320px',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(15, 118, 110, 0.18)',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              boxShadow: 'inset 0 1px 2px rgba(15, 118, 110, 0.08)',
              fontSize: '14px',
              color: '#111827',
            }}
          />
        </>
      )}
      {(popupSelection === 'offer-discount' ||
        (popupSelection === 'subscribe-discount' && emailSubmitted)) &&
        discountCode && (
        <div
          onClick={handleCopyCode}
          style={{
            marginTop: '8px',
            padding: '10px 16px',
            borderRadius: '12px',
            ...(selectedLayout === 'layout-2' && template?.preview?.accent ? {
              backgroundColor: template.preview.accent,
              border: `1px solid ${template.preview.accent}`,
              color: '#FFFFFF',
            } : {
              background: 'linear-gradient(120deg, rgba(34,197,94,0.12), rgba(59,130,246,0.12))',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              color: '#064e3b',
            }),
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            ...(selectedLayout === 'layout-2' ? {
              justifyContent: 'space-between',
              width: '100%',
            } : {}),
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {selectedLayout === 'layout-2' ? (
            <>
              <span style={{fontFamily: 'monospace', letterSpacing: '0.05em'}}>
                {copied ? 'Copied!' : discountCode}
              </span>
              {!copied && (
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 16 16" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  style={{marginLeft: 'auto', flexShrink: 0}}
                >
                  <path 
                    d="M5.5 4V3C5.5 2.17157 6.17157 1.5 7 1.5H11C11.8284 1.5 12.5 2.17157 12.5 3V7C12.5 7.82843 11.8284 8.5 11 8.5H10" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                  />
                  <path 
                    d="M4 5.5C3.17157 5.5 2.5 6.17157 2.5 7V11C2.5 11.8284 3.17157 12.5 4 12.5H8C8.82843 12.5 9.5 11.8284 9.5 11V7C9.5 6.17157 8.82843 5.5 8 5.5H4Z" 
                    stroke="currentColor" 
                    strokeWidth="1.5"
                  />
                </svg>
              )}
            </>
          ) : (
            <>
              <span>{copied ? 'Copied!' : 'Code:'}</span>
              <span style={{fontFamily: 'monospace', letterSpacing: '0.05em'}}>
                {discountCode}
              </span>
            </>
          )}
        </div>
      )}
      {(popupSelection === 'collect-email' ||
        (popupSelection === 'subscribe-discount' && !emailSubmitted)) && (
      <button
        type="button"
        onClick={() => {
          if (popupSelection === 'subscribe-discount') {
            setEmailSubmitted(true);
          }
        }}
        style={{
          alignSelf: 'flex-start',
          backgroundColor: template.preview.cta,
          border: 'none',
          borderRadius: '999px',
          padding: '12px 28px',
          color: '#FFFFFF',
          fontWeight: 600,
          fontSize: '15px',
          cursor: 'pointer',
          boxShadow: '0 12px 24px rgba(16, 185, 129, 0.25)',
        }}
      >
        {buttonLabel}
      </button>
      )}
      {countdownContent}
    </div>
  );

  const image = (
    <div
      style={{
        position: 'relative',
        minHeight: '360px',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#F9FAFB',
        order: layout === 'image-left' ? 0 : 1,
      }}
    >
      <img
        src={imageUrl}
        alt="Popup visual"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  );

  // Render Layout 1 if selected - simply display the image
  if (selectedLayout === 'layout-1') {
    return (
      <Card>
        <BlockStack gap="400" padding="400">
          <Text as="h2" variant="headingMd">
            Preview Section
          </Text>
          <div
            style={{
              minHeight: '420px',
              backgroundColor: 'var(--p-color-bg-surface-secondary)',
              borderRadius: 'var(--p-border-radius-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              overflow: 'hidden',
              width: '100%',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '880px',
                height: '750px',
                borderRadius: '20px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <img
                src={backgroundImageUrl || DEFAULT_IMAGE}
                alt="Layout 1"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
              />
              {heading && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    fontFamily: 'serif',
                    color: styles?.textColor || '#FFFFFF',
                    fontSize: `${styles?.titleSize || '20'}px`,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    width: '100%',
                    padding: '0 24px',
                  }}
                >
                  {heading}
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  top: '145px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                  fontFamily: 'serif',
                  color: layouts?.discountColor || '#000000',
                  fontSize: '72px',
                  fontWeight: 700,
                  fontStyle: 'italic',
                  lineHeight: 1,
                  width: '100%',
                  padding: '0 24px',
                }}
              >
                {discountPercentage}
              </div>
              {description && (
                <div
                  style={{
                    position: 'absolute',
                    top: '220px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    color: layouts?.descriptionColor || '#000000',
                    fontSize: `${styles?.descriptionSize || '18'}px`,
                    fontWeight: 400,
                    lineHeight: 1.5,
                    width: '100%',
                    padding: '0 24px',
                    maxWidth: '600px',
                    wordWrap: 'break-word',
                  }}
                >
                  {description}
                </div>
              )}
              <button
                type="button"
                style={{
                  position: 'absolute',
                  top: '340px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: layouts?.buttonColor || '#D4A574',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 24px',
                  fontFamily: 'sans-serif',
                  fontSize: '16px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  whiteSpace: 'nowrap',
                }}
              >
                {buttonText}
                <span style={{ fontSize: '18px' }}>→</span>
              </button>
              <div
                style={{
                  position: 'absolute',
                  bottom: '40px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  color: layouts?.disclaimerColor || '#2B1A11',
                  fontSize: '14px',
                  lineHeight: 1.4,
                  width: '90%',
                  maxWidth: '640px',
                  opacity: 0.9,
                  wordBreak: 'break-word',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: layouts?.disclaimerColor || '#2B1A11',
                    marginRight: '6px',
                  }}
                >
                  Disclaimer:
                </span>
                <span style={{ fontWeight: 400 }}>{disclaimer}</span>
              </div>
            </div>
          </div>
        </BlockStack>
      </Card>
    );
  }

  // Render Layout 3 if selected - simple white box
  if (selectedLayout === 'layout-3') {
    return (
      <Card>
        <BlockStack gap="400" padding="400">
          <Text as="h2" variant="headingMd">
            Preview Section
          </Text>
          <div
            style={{
              minHeight: '420px',
              backgroundColor: 'var(--p-color-bg-surface-secondary)',
              borderRadius: 'var(--p-border-radius-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              overflow: 'hidden',
              width: '100%',
            }}
          >
            <div
              style={{
                width: '568px',
                height: '565px',
                backgroundColor: styles?.backgroundColor || '#FFFFFF',
                borderRadius: '20px',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
              }}
            >
              {/* Left side - for text content */}
              <div
                style={{
                  flex: '2',
                  backgroundColor: styles?.backgroundColor || '#FFFFFF',
                  position: 'relative',
                }}
              >
                {/* Top-left decorative bars */}
                <div
                  style={{
                    position: 'absolute',
                    top: '20px',  
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '4px',
                    justifyContent: 'center',
                  }}
                >
                  {/* Gray bar (taller) */}
                  <div
                    style={{
                      width: '15px',
                      height: '90px',
                      backgroundColor: '#808080',
                    }}
                  />
                  {/* Black bar (shorter) */}
                  <div
                    style={{
                      width: '15px',
                      height: '60px',
                      backgroundColor: '#000000',
                    }}
                  />
                </div>
                
                {/* Bottom-left decorative bars */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '4px',
                    justifyContent: 'center',
                  }}
                >
                  {/* Black bar (taller) */}
                  <div
                    style={{
                      width: '15px',
                      height: '90px',
                      backgroundColor: '#000000',
                    }}
                  />
                  {/* Gray bar (shorter) */}
                  <div
                    style={{
                      width: '15px',
                      height: '60px',
                      backgroundColor: '#808080',
                    }}
                  />
                </div>
                
                {/* Text content */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    width: '80%',
                    maxWidth: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                    <div
                      style={{
                        color: styles?.textColor || '#000000',
                        fontFamily: "'Sour Gummy', serif",
                        fontSize: '16px',
                      }}
                    >
                      {layout3Text}
                    </div>
                    <div
                      style={{
                        color: styles?.textColor || '#000000',
                        fontFamily: "'Sour Gummy', serif",
                        fontSize: '55px',
                        marginTop: '5px',
                      }}
                    >
                      {layout3DiscountText}% off
                    </div>
                    <div
                      style={{
                        color: styles?.textColor || '#000000',
                        fontFamily: "'Sour Gummy', serif",
                        fontSize: '40px',
                        marginTop: '50px',
                      }}
                    >
                      {layout3BrandName}
                    </div>
                    <div
                      style={{
                        color: styles?.urlColor || '#000000',
                        fontFamily: "'Sour Gummy', serif",
                        fontSize: '14px',
                        marginTop: '50px',
                      }}
                    >
                      {layout3UrlName}
                    </div>
                </div>
              </div>
              {/* Right side - with border for image */}
              <div
                style={{
                  flex: '1',
                  backgroundColor: '#FFFFFF',
                  position: 'relative',
                  borderTop: `${layouts?.borderSize || 1}px solid ${styles?.borderColor || '#C9A876'}`,
                  borderLeft: `${layouts?.borderSize || 1}px solid ${styles?.borderColor || '#C9A876'}`,
                  marginTop: '68px',
                  paddingLeft: '90px',
                  boxSizing: 'border-box',
                  marginBottom: '40px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {layouts?.layout3ImageUrl ? (
                  <img
                    src={layouts.layout3ImageUrl}
                    alt="Layout 3"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                  />
                ) : (
                  <img
                    src={LAYOUT_3_IMAGE}
                    alt="Layout 3"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </BlockStack>
      </Card>
    );
  }

  // Render Layout 4 if selected - show preview image
  if (selectedLayout === 'layout-4') {
    const previewImageUrl = layouts?.layout4PreviewImageUrl || '';
    
    return (
      <Card>
        <BlockStack gap="400" padding="400">
          <Text as="h2" variant="headingMd">
            Preview Section
          </Text>
          <div
            style={{
              minHeight: '420px',
              backgroundColor: 'var(--p-color-bg-surface-secondary)',
              borderRadius: 'var(--p-border-radius-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              overflow: 'hidden',
              width: '100%',
            }}
          >
            {previewImageUrl ? (
              <div
                style={{
                  width: '100%',
                  maxWidth: '880px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <img
                  src={previewImageUrl}
                  alt="Layout 4 Preview"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  maxWidth: '880px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <img
                  src={LAYOUT_4_IMAGE}
                  alt="Layout 4 Preview"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </div>
            )}
          </div>
        </BlockStack>
      </Card>
    );
  }

  // Default preview for layout-2 or any other layout
  // This shows the goal-based popup preview (template-based) and does NOT use layout-1 specific fields
  return (
    <Card>
      <BlockStack gap="400" padding="400">
        <Text as="h2" variant="headingMd">
          Preview Section
        </Text>
        <div
          style={{
            minHeight: '420px',
            backgroundColor: 'var(--p-color-bg-surface-secondary)',
            borderRadius: 'var(--p-border-radius-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <div style={containerStyle}>
            {layout === 'image-left' && image}
            {content}
            {layout === 'image-right' && image}
          </div>
        </div>
      </BlockStack>
    </Card>
  );
}

