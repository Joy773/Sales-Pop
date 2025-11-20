import {Card, Text, BlockStack} from '@shopify/polaris';
import {getTemplateById} from './bannerTemplates';
import {useState, useRef, useEffect} from 'react';

const DEFAULT_IMAGE =
  'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';

export default function BannerPreview({settings}) {
  const {
    goal = {},
    styles = {},
    countdown = {},
  } = settings || {};
  const template = getTemplateById(styles.selectedTemplate);
  const layout = styles.popoutLayout?.[0] || 'image-left';
  const backgroundImageUrl = (styles.backgroundImageUrl ?? '').trim();
  const imageUrl = backgroundImageUrl || DEFAULT_IMAGE;

  const heading = goal.popupTitle || 'Welcome to our store';
  const description =
    goal.popupDescription ||
    'Share a short message to encourage shoppers to subscribe.';
  const buttonLabel = goal.buttonText || 'Join now';
  const textSize = 16;
  const headingFontSize = 24;
  const popupSelection = goal.popupSelection?.[0];
  const subscriptionType = goal.subscriptionType?.[0] || 'email';
  const shouldShowContactInput =
    popupSelection === 'collect-email' || popupSelection === 'subscribe-discount';
  const contactInputType = subscriptionType === 'phone' ? 'tel' : 'email';
  const contactPlaceholder =
    goal.emailLabel ||
    (subscriptionType === 'phone' ? 'Your phone number' : 'Your email address');
  const discountCode = goal.discountCode?.trim();

  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef(null);

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
      {shouldShowContactInput && (
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
      )}
      {(popupSelection === 'offer-discount' ||
        popupSelection === 'subscribe-discount') &&
        discountCode && (
        <div
          onClick={handleCopyCode}
          style={{
            marginTop: '8px',
            padding: '10px 16px',
            borderRadius: '12px',
            background:
              'linear-gradient(120deg, rgba(34,197,94,0.12), rgba(59,130,246,0.12))',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            fontWeight: 600,
            color: '#064e3b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
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
          <span>{copied ? 'Copied!' : 'Code:'}</span>
          <span style={{fontFamily: 'monospace', letterSpacing: '0.05em'}}>
            {discountCode}
          </span>
        </div>
      )}
      {(popupSelection === 'collect-email' ||
        popupSelection === 'subscribe-discount') && (
        <button
          type="button"
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

