import {useEffect, useState, useRef} from 'react';
import {
  Box,
  Card,
  Checkbox,
  ChoiceList,
  FormLayout,
  Select,
  Tabs,
  Text,
  TextField,
} from '@shopify/polaris';
import {BANNER_TEMPLATES} from './bannerTemplates';

const BASE_TABS = [
  {id: 'layouts', content: 'Layouts', panelID: 'layouts-content'},
  {id: 'goal', content: 'Goal', panelID: 'goal-content'},
  {id: 'styles', content: 'Styles', panelID: 'styles-content'},
];

export default function BannerTabSection({settings, onSettingsChange}) {
  const [selectedTab, setSelectedTab] = useState(0);
  const {goal, countdown, styles, layouts} = settings;
  const prevLayoutRef = useRef(layouts?.selectedLayout);
  
  // Filter out tabs based on selected layout
  const tabs = (() => {
    const selectedLayout = layouts?.selectedLayout;
    if (selectedLayout === 'layout-4') {
      // Hide goal and styles tabs for layout-4
      return BASE_TABS.filter(tab => tab.id !== 'goal' && tab.id !== 'styles');
    } else if (selectedLayout === 'layout-1' || selectedLayout === 'layout-2' || selectedLayout === 'layout-3') {
      // Hide goal tab for layout-1, layout-2, and layout-3
      return BASE_TABS.filter(tab => tab.id !== 'goal');
    }
    return BASE_TABS;
  })();

  // Auto-switch tabs when layout changes
  useEffect(() => {
    const prevLayout = prevLayoutRef.current;
    const currentLayout = layouts?.selectedLayout;
    
    // Only react when layout actually changes
    if (prevLayout !== currentLayout) {
      setSelectedTab((currentTab) => {
        const isLayout4 = currentLayout === 'layout-4';
        const isLayout1Or2Or3 = currentLayout === 'layout-1' || currentLayout === 'layout-2' || currentLayout === 'layout-3';
        const wasLayout4 = prevLayout === 'layout-4';
        const wasLayout1Or2Or3 = prevLayout === 'layout-1' || prevLayout === 'layout-2' || prevLayout === 'layout-3';
        
        if (isLayout4) {
          // When layout-4 is selected, goal tab (index 1) and styles tab (index 2) are removed
          // Only layouts tab (index 0) remains, so always switch to 0
          return 0;
        } else if (isLayout1Or2Or3) {
          // When layout-1, layout-2, or layout-3 is selected, goal tab (index 1) is removed
          // If user was on goal tab, switch to layouts tab (index 0)
          if (currentTab === 1) {
            return 0;
          } else if (currentTab === 2) {
            // Styles tab moves from index 2 to index 1
            return 1;
          }
          return currentTab;
        } else if (wasLayout4) {
          // When switching from layout-4, both goal and styles tabs are restored
          // Ensure tab index is within valid range
          const maxIndex = BASE_TABS.length - 1;
          if (currentTab > maxIndex) {
            return 0;
          }
        } else if (wasLayout1Or2Or3) {
          // When switching from layout-1, layout-2, or layout-3, goal tab is restored
          // Ensure tab index is within valid range
          const maxIndex = BASE_TABS.length - 1;
          if (currentTab > maxIndex) {
            return 0;
          }
        }
        return currentTab;
      });
      prevLayoutRef.current = currentLayout;
    }
  }, [layouts?.selectedLayout]);

  const updateGoal = (field, value) =>
    onSettingsChange((prev) => ({
      ...prev,
      goal: {...prev.goal, [field]: value},
    }));

  const updateCountdown = (field, value) =>
    onSettingsChange((prev) => ({
      ...prev,
      countdown: {...prev.countdown, [field]: typeof value === 'string' ? value.trim() : value},
    }));

  const updateStyles = (field, value) =>
    onSettingsChange((prev) => ({
      ...prev,
      styles: {...prev.styles, [field]: value},
    }));

  const updateLayouts = (field, value) =>
    onSettingsChange((prev) => ({
      ...prev,
      layouts: {...prev.layouts, [field]: value},
    }));

  const handleTabChange = (selectedIndex) => {
    setSelectedTab(selectedIndex);
  };

  const handleSubscriptionTypeChange = (value) => {
    onSettingsChange((prev) => {
      const newType = value[0];
      const defaultLabel =
        newType === 'phone' ? 'Your phone number' : 'Your email address';
      const currentLabel = prev.goal.emailLabel;
      const shouldReset =
        !currentLabel ||
        currentLabel === 'Your email address' ||
        currentLabel === 'Your phone number';

      return {
        ...prev,
        goal: {
          ...prev.goal,
          subscriptionType: value,
          emailLabel: shouldReset ? defaultLabel : currentLabel,
        },
      };
    });
  };

  const subscriptionLabel =
    goal.subscriptionType[0] === 'phone' ? 'Phone label' : 'Email label';

  const subscriptionPlaceholder =
    goal.subscriptionType[0] === 'phone'
      ? 'Your phone number'
      : 'Your email address';

  const goalTabContent = (
    <Card sectioned>
      <Box className="flex flex-col gap-6">
        {layouts?.selectedLayout !== 'layout-1' && (
          <ChoiceList
            title="Choose your popup"
            selected={goal.popupSelection}
            choices={[
              {label: 'Collect email', value: 'collect-email'},
              {label: 'Offer discount coupon', value: 'offer-discount'},
              {label: 'Subscribe to show discount code', value: 'subscribe-discount'},
              {label: 'Announcement', value: 'announcement'},
            ]}
            onChange={(value) => updateGoal('popupSelection', value)}
          />
        )}

        {layouts?.selectedLayout !== 'layout-1' && (
          <>
            <Select
              label="Display on page"
              options={[
                {label: 'Homepage', value: 'homepage'},
                {label: 'Specific page', value: 'specific-page'},
                {label: 'All page', value: 'all-page'},
              ]}
              value={goal.displayOnPage || 'all-page'}
              onChange={(value) => updateGoal('displayOnPage', value)}
            />

            {goal.displayOnPage === 'specific-page' && (
              <TextField
                label="Page URL"
                value={goal.specificPageUrl || ''}
                onChange={(value) => updateGoal('specificPageUrl', value)}
                placeholder="/pages/about-us or /products/product-name"
                autoComplete="off"
                helpText="Enter the page URL where you want the popup to appear"
              />
            )}

            <FormLayout>
              <TextField
                label="Popup title"
                value={goal.popupTitle}
                onChange={(value) => updateGoal('popupTitle', value)}
                placeholder="Welcome discount"
                autoComplete="off"
              />
              <TextField
                label="Popup description"
                value={goal.popupDescription}
                onChange={(value) => updateGoal('popupDescription', value)}
                multiline
                placeholder="Share a short message to encourage sign-ups."
              />
            </FormLayout>
          </>
        )}

        {(goal.popupSelection[0] === 'offer-discount' ||
          goal.popupSelection[0] === 'subscribe-discount') && (
          <Box paddingBlockStart="200" className="flex flex-col gap-2">
            <TextField
              label="Input your discount code"
              value={goal.discountCode || ''}
              onChange={(value) => updateGoal('discountCode', value)}
              placeholder="SUMMER2025"
              autoComplete="off"
            />
            <Text tone="subdued" as="span" variant="bodySm">
              Need to match available discount code in{' '}
              <a
                href="https://admin.shopify.com/store/{shop}/discounts"
                target="_blank"
                rel="noopener noreferrer"
              >
                Shopify Discounts
              </a>
            </Text>
          </Box>
        )}

        {(goal.popupSelection[0] === 'collect-email' ||
          goal.popupSelection[0] === 'subscribe-discount') && (
          <>
            <ChoiceList
              title="Choose subscription type"
              selected={goal.subscriptionType}
              choices={[
                {label: 'Email', value: 'email'},
                {label: 'Phone', value: 'phone'},
              ]}
              onChange={handleSubscriptionTypeChange}
            />

            <TextField
              label={subscriptionLabel}
              value={goal.emailLabel}
              onChange={(value) => updateGoal('emailLabel', value)}
              placeholder={subscriptionPlaceholder}
              autoComplete="off"
            />
          </>
        )}

        {(goal.popupSelection[0] === 'collect-email' ||
          goal.popupSelection[0] === 'subscribe-discount') && (
        <Box paddingBlockStart="200">
          <TextField
            label="Button text"
            value={goal.buttonText}
            onChange={(value) => updateGoal('buttonText', value)}
            placeholder="Add button text"
            autoComplete="off"
          />
        </Box>
        )}

        {layouts?.selectedLayout !== 'layout-1' && (
          <TextField
            label="Success message (When subscribed successfully)"
            value={goal.successMessage}
            onChange={(value) => updateGoal('successMessage', value)}
            placeholder="Congratulations! You've successfully joined our list."
            autoComplete="off"
            multiline
          />
        )}

        {goal.popupSelection[0] !== 'announcement' &&
          goal.popupSelection[0] !== 'collect-email' && (
          <>
        <Box className="pt-2">
          <Checkbox
            label="Enable countdown"
            checked={countdown.isCountdownEnabled}
            onChange={(checked) => updateCountdown('isCountdownEnabled', checked)}
          />
        </Box>

        {countdown.isCountdownEnabled && (
          <Box className="flex flex-col gap-4 pl-2">
            <ChoiceList
              title="Choose countdown type"
              selected={countdown.countdownType}
              choices={[
                {label: 'Specific end date', value: 'specific-end-date'},
                {label: 'Loop interval', value: 'loop-interval'},
              ]}
              onChange={(value) => updateCountdown('countdownType', value)}
            />

            <FormLayout>
              {countdown.countdownType[0] === 'specific-end-date' && (
                <FormLayout.Group>
                  <TextField
                    type="date"
                    label="Countdown end date"
                    value={countdown.countdownEndDate}
                    onChange={(value) =>
                      updateCountdown('countdownEndDate', value)
                    }
                  />
                </FormLayout.Group>
              )}

              {countdown.countdownType[0] === 'loop-interval' && (
                <FormLayout.Group>
                  <TextField
                    type="number"
                    min={0}
                    label="Days"
                    value={countdown.loopIntervalDays}
                    onChange={(value) =>
                      updateCountdown('loopIntervalDays', value)
                    }
                    placeholder="0"
                  />
                  <TextField
                    type="number"
                    min={0}
                    label="Hours"
                    value={countdown.loopIntervalHours}
                    onChange={(value) =>
                      updateCountdown('loopIntervalHours', value)
                    }
                    placeholder="0"
                  />
                  <TextField
                    type="number"
                    min={0}
                    label="Minutes"
                    value={countdown.loopIntervalMinutes}
                    onChange={(value) =>
                      updateCountdown('loopIntervalMinutes', value)
                    }
                    placeholder="0"
                  />
                </FormLayout.Group>
              )}

              <TextField
                label="Days label"
                value={countdown.daysLabel}
                onChange={(value) => updateCountdown('daysLabel', value)}
                placeholder="Days"
                autoComplete="off"
              />
              <TextField
                label="Hour label"
                value={countdown.hoursLabel}
                onChange={(value) => updateCountdown('hoursLabel', value)}
                placeholder="Hrs"
                autoComplete="off"
              />
              <TextField
                label="Minute label"
                value={countdown.minutesLabel}
                onChange={(value) => updateCountdown('minutesLabel', value)}
                placeholder="Mins"
                autoComplete="off"
              />
              <TextField
                label="Second label"
                value={countdown.secondsLabel}
                onChange={(value) => updateCountdown('secondsLabel', value)}
                placeholder="Secs"
                autoComplete="off"
              />
            </FormLayout>
          </Box>
            )}
          </>
        )}
      </Box>
    </Card>
  );

  const tabPanels = [
    <Card key="layouts" sectioned>
      <Box className="flex flex-col gap-6 pt-2">
        <Select
          label="Choose Layout"
          options={[
            {label: 'Layout 1', value: 'layout-1'},
            {label: 'Layout 2', value: 'layout-2'},
            {label: 'Layout 3', value: 'layout-3'},
            {label: 'Layout 4', value: 'layout-4'},
          ]}
          value={layouts?.selectedLayout || 'layout-1'}
          onChange={(value) => updateLayouts('selectedLayout', value)}
        />
        {layouts?.selectedLayout === 'layout-4' && (
          <>
            <Box style={{ marginTop: '16px' }}>
              <Select
                label="Display on page"
                options={[
                  {label: 'Homepage', value: 'homepage'},
                  {label: 'All page', value: 'all-page'},
                ]}
                value={layouts?.layout4ShowBannerTo || 'homepage'}
                onChange={(value) => updateLayouts('layout4ShowBannerTo', value)}
              />
            </Box>
            <Box style={{ marginTop: '16px' }}>
              <TextField
                label="Preview Image"
                value={layouts?.layout4PreviewImageUrl || ''}
                onChange={(value) => updateLayouts('layout4PreviewImageUrl', value)}
                placeholder="Enter image URL"
                autoComplete="off"
                type="url"
              />
            </Box>
            <Box style={{ marginTop: '16px' }}>
              <TextField
                label="Page link"
                value={layouts?.layout4PageLink || ''}
                onChange={(value) => updateLayouts('layout4PageLink', value)}
                placeholder="Enter page link"
                autoComplete="off"
                type="url"
              />
            </Box>
          </>
        )}
        {layouts?.selectedLayout === 'layout-3' && (
          <>
            <Box style={{ marginTop: '16px' }}>
              <Select
                label="Display on page"
                options={[
                  {label: 'Homepage', value: 'homepage'},
                  {label: 'All pages', value: 'all-pages'},
                ]}
                value={layouts?.showBannerTo || 'homepage'}
                onChange={(value) => updateLayouts('showBannerTo', value)}
              />
            </Box>
            <Box style={{ marginTop: '16px' }}>
              <TextField
                label="Border Size"
                value={layouts?.borderSize || '1'}
                onChange={(value) => {
                  const numValue = parseInt(value, 10);
                  if (value === '' || (!isNaN(numValue) && numValue >= 1 && numValue <= 10)) {
                    updateLayouts('borderSize', value);
                  }
                }}
                placeholder="Enter border size (1-10)"
                autoComplete="off"
                type="number"
                min="1"
                max="10"
              />
            </Box>
            <Box style={{ marginTop: '16px' }}>
              <TextField
                label="Text"
                value={layouts?.text || ''}
                onChange={(value) => updateLayouts('text', value)}
                placeholder="Enter text"
                autoComplete="off"
              />
            </Box>
            <Box style={{ marginTop: '16px' }}>
              <TextField
                label="Discount Text"
                value={layouts?.discountText || ''}
                onChange={(value) => {
                  // Only allow numeric characters
                  const numericValue = value.replace(/[^0-9]/g, '');
                  updateLayouts('discountText', numericValue);
                }}
                placeholder="Enter discount percentage (e.g., 50)"
                autoComplete="off"
                type="number"
                min="0"
                max="100"
              />
            </Box>
            <Box style={{ marginTop: '16px' }}>
              <TextField
                label="Brand Name"
                value={layouts?.brandName || ''}
                onChange={(value) => updateLayouts('brandName', value)}
                placeholder="Enter brand name"
                autoComplete="off"
              />
            </Box>
            <Box style={{ marginTop: '16px' }}>
              <TextField
                label="URL name"
                value={layouts?.urlName || ''}
                onChange={(value) => updateLayouts('urlName', value)}
                placeholder="Enter URL name"
                autoComplete="off"
              />
            </Box>
            <Box style={{ marginTop: '16px' }}>
              <TextField
                label="Add Image"
                value={layouts?.layout3ImageUrl || ''}
                onChange={(value) => updateLayouts('layout3ImageUrl', value)}
                placeholder="Enter image URL"
                autoComplete="off"
                type="url"
              />
            </Box>
          </>
        )}
        {layouts?.selectedLayout === 'layout-1' && (
          <>
            <Box style={{ marginTop: '16px' }}>
              <Select
                label="Display on page"
                options={[
                  {label: 'Homepage', value: 'homepage'},
                  {label: 'Specific page', value: 'specific-page'},
                  {label: 'All page', value: 'all-page'},
                ]}
                value={goal.displayOnPage || 'all-page'}
                onChange={(value) => updateGoal('displayOnPage', value)}
              />
            </Box>

            {goal.displayOnPage === 'specific-page' && (
              <Box style={{ marginTop: '16px' }}>
                <TextField
                  label="Page URL"
                  value={goal.specificPageUrl || ''}
                  onChange={(value) => updateGoal('specificPageUrl', value)}
                  placeholder="/pages/about-us or /products/product-name"
                  autoComplete="off"
                  helpText="Enter the page URL where you want the popup to appear"
                />
              </Box>
            )}

            <Box style={{ marginTop: '16px' }}>
              <FormLayout>
                <TextField
                  label="Popup title"
                  value={goal.popupTitle}
                  onChange={(value) => updateGoal('popupTitle', value)}
                  placeholder="Welcome discount"
                  autoComplete="off"
                />
                <TextField
                  label="Popup description"
                  value={goal.popupDescription}
                  onChange={(value) => updateGoal('popupDescription', value)}
                  multiline
                  placeholder="Share a short message to encourage sign-ups."
                />
              </FormLayout>
            </Box>

            <Box style={{ marginTop: '16px' }}>
              <TextField
                label="Discount Percentage"
                value={layouts?.discountPercentage || ''}
                onChange={(value) => updateLayouts('discountPercentage', value)}
                placeholder="Enter discount percentage"
                autoComplete="off"
              />
            </Box>

            <Box style={{ marginTop: '16px' }}>
              <TextField
                label="Button text"
                value={layouts?.buttonText || ''}
                onChange={(value) => updateLayouts('buttonText', value)}
                placeholder="Enter button text (e.g., SHOP 35% OFF)"
                autoComplete="off"
              />
            </Box>

            <Box style={{ marginTop: '16px' }}>
              <TextField
                label="Button URL"
                value={layouts?.buttonUrl || ''}
                onChange={(value) => updateLayouts('buttonUrl', value)}
                placeholder="Enter button URL (e.g., https://example.com)"
                autoComplete="off"
                type="url"
              />
            </Box>

            <Box style={{ marginTop: '16px' }}>
              <TextField
                label="Disclaimer text"
                value={layouts?.disclaimer || ''}
                onChange={(value) => updateLayouts('disclaimer', value)}
                placeholder="Enter disclaimer text"
                autoComplete="off"
                multiline
                maxLength={200}
              />
            </Box>
          </>
        )}

        {/* Goal content for layout-2 */}
        {layouts?.selectedLayout === 'layout-2' && (
          <>
            <ChoiceList
              title="Choose your popup"
              selected={goal.popupSelection}
              choices={[
                {label: 'Collect email', value: 'collect-email'},
                {label: 'Offer discount coupon', value: 'offer-discount'},
                {label: 'Subscribe to show discount code', value: 'subscribe-discount'},
                {label: 'Announcement', value: 'announcement'},
              ]}
              onChange={(value) => updateGoal('popupSelection', value)}
            />

            <Select
              label="Display on page"
              options={[
                {label: 'Homepage', value: 'homepage'},
                {label: 'Specific page', value: 'specific-page'},
                {label: 'All page', value: 'all-page'},
              ]}
              value={goal.displayOnPage || 'all-page'}
              onChange={(value) => updateGoal('displayOnPage', value)}
            />

            {goal.displayOnPage === 'specific-page' && (
              <TextField
                label="Page URL"
                value={goal.specificPageUrl || ''}
                onChange={(value) => updateGoal('specificPageUrl', value)}
                placeholder="/pages/about-us or /products/product-name"
                autoComplete="off"
                helpText="Enter the page URL where you want the popup to appear"
              />
            )}

            <FormLayout>
              <TextField
                label="Popup title"
                value={goal.popupTitle}
                onChange={(value) => updateGoal('popupTitle', value)}
                placeholder="Welcome discount"
                autoComplete="off"
              />
              <TextField
                label="Popup description"
                value={goal.popupDescription}
                onChange={(value) => updateGoal('popupDescription', value)}
                multiline
                placeholder="Share a short message to encourage sign-ups."
              />
            </FormLayout>

            {(goal.popupSelection[0] === 'offer-discount' ||
              goal.popupSelection[0] === 'subscribe-discount') && (
              <Box paddingBlockStart="200" className="flex flex-col gap-2">
                <TextField
                  label="Input your discount code"
                  value={goal.discountCode || ''}
                  onChange={(value) => updateGoal('discountCode', value)}
                  placeholder="SUMMER2025"
                  autoComplete="off"
                />
                <Text tone="subdued" as="span" variant="bodySm">
                  Need to match available discount code in{' '}
                  <a
                    href="https://admin.shopify.com/store/discounts"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Shopify Discounts
                  </a>
                </Text>
              </Box>
            )}

            {(goal.popupSelection[0] === 'collect-email' ||
              goal.popupSelection[0] === 'subscribe-discount') && (
              <>
                <ChoiceList
                  title="Choose subscription type"
                  selected={goal.subscriptionType}
                  choices={[
                    {label: 'Email', value: 'email'},
                    {label: 'Phone', value: 'phone'},
                  ]}
                  onChange={handleSubscriptionTypeChange}
                />

                <TextField
                  label={subscriptionLabel}
                  value={goal.emailLabel}
                  onChange={(value) => updateGoal('emailLabel', value)}
                  placeholder={subscriptionPlaceholder}
                  autoComplete="off"
                />
              </>
            )}

            {(goal.popupSelection[0] === 'collect-email' ||
              goal.popupSelection[0] === 'subscribe-discount') && (
              <Box paddingBlockStart="200">
                <TextField
                  label="Button text"
                  value={goal.buttonText}
                  onChange={(value) => updateGoal('buttonText', value)}
                  placeholder="Add button text"
                  autoComplete="off"
                />
              </Box>
            )}

            <TextField
              label="Success message (When subscribed successfully)"
              value={goal.successMessage}
              onChange={(value) => updateGoal('successMessage', value)}
              placeholder="Congratulations! You've successfully joined our list."
              autoComplete="off"
              multiline
            />

            {goal.popupSelection[0] !== 'announcement' &&
              goal.popupSelection[0] !== 'collect-email' && (
              <>
                <Box className="pt-2">
                  <Checkbox
                    label="Enable countdown"
                    checked={countdown.isCountdownEnabled}
                    onChange={(checked) => updateCountdown('isCountdownEnabled', checked)}
                  />
                </Box>

                {countdown.isCountdownEnabled && (
                  <Box className="flex flex-col gap-4 pl-2">
                    <ChoiceList
                      title="Choose countdown type"
                      selected={countdown.countdownType}
                      choices={[
                        {label: 'Specific end date', value: 'specific-end-date'},
                        {label: 'Loop interval', value: 'loop-interval'},
                      ]}
                      onChange={(value) => updateCountdown('countdownType', value)}
                    />

                    <FormLayout>
                      {countdown.countdownType[0] === 'specific-end-date' && (
                        <FormLayout.Group>
                          <TextField
                            type="date"
                            label="Countdown end date"
                            value={countdown.countdownEndDate}
                            onChange={(value) =>
                              updateCountdown('countdownEndDate', value)
                            }
                          />
                        </FormLayout.Group>
                      )}

                      {countdown.countdownType[0] === 'loop-interval' && (
                        <FormLayout.Group>
                          <TextField
                            type="number"
                            min={0}
                            label="Days"
                            value={countdown.loopIntervalDays}
                            onChange={(value) =>
                              updateCountdown('loopIntervalDays', value)
                            }
                            placeholder="0"
                          />
                          <TextField
                            type="number"
                            min={0}
                            label="Hours"
                            value={countdown.loopIntervalHours}
                            onChange={(value) =>
                              updateCountdown('loopIntervalHours', value)
                            }
                            placeholder="0"
                          />
                          <TextField
                            type="number"
                            min={0}
                            label="Minutes"
                            value={countdown.loopIntervalMinutes}
                            onChange={(value) =>
                              updateCountdown('loopIntervalMinutes', value)
                            }
                            placeholder="0"
                          />
                        </FormLayout.Group>
                      )}

                      <TextField
                        label="Days label"
                        value={countdown.daysLabel}
                        onChange={(value) => updateCountdown('daysLabel', value)}
                        placeholder="Days"
                        autoComplete="off"
                      />
                      <TextField
                        label="Hour label"
                        value={countdown.hoursLabel}
                        onChange={(value) => updateCountdown('hoursLabel', value)}
                        placeholder="Hrs"
                        autoComplete="off"
                      />
                      <TextField
                        label="Minute label"
                        value={countdown.minutesLabel}
                        onChange={(value) => updateCountdown('minutesLabel', value)}
                        placeholder="Mins"
                        autoComplete="off"
                      />
                      <TextField
                        label="Second label"
                        value={countdown.secondsLabel}
                        onChange={(value) => updateCountdown('secondsLabel', value)}
                        placeholder="Secs"
                        autoComplete="off"
                      />
                    </FormLayout>
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </Box>
    </Card>,
    ...(layouts?.selectedLayout !== 'layout-1' && layouts?.selectedLayout !== 'layout-2' && layouts?.selectedLayout !== 'layout-3' && layouts?.selectedLayout !== 'layout-4' ? [goalTabContent] : []),
    ...(layouts?.selectedLayout !== 'layout-4' ? [
      <Card key="styles" sectioned>
      <Box className="flex flex-col gap-6 pt-2">
       
        {layouts?.selectedLayout !== 'layout-3' && layouts?.selectedLayout !== 'layout-1' && (
          <ChoiceList
            title="Popout layout"
            selected={styles.popoutLayout}
            choices={[
              {label: 'Image left', value: 'image-left'},
              {label: 'Image right', value: 'image-right'},
            ]}
            onChange={(value) => updateStyles('popoutLayout', value)}
          />
        )}

        {layouts?.selectedLayout === 'layout-3' && (
          <>
          <Box style={{ marginTop: '16px' }}>
            <Text as="label" variant="bodyMd" fontWeight="medium">
              Background color
            </Text>
            <div style={{ 
              marginTop: '8px',
              position: 'relative',
              width: '100%',
              maxWidth: '200px'
            }}>
              <div style={{ 
                position: 'relative',
                height: '40px',
                borderRadius: 'var(--p-border-radius-200)',
                border: '1px solid var(--p-color-border-subdued)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                backgroundColor: '#FFFFFF'
              }}>
                <input
                  type="color"
                  value={styles?.backgroundColor || '#FFFFFF'}
                  onChange={(e) => updateStyles('backgroundColor', e.target.value)}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    margin: 0,
                    padding: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                />
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: '1px solid var(--p-color-border-subdued)',
                  backgroundColor: styles?.backgroundColor || '#FFFFFF',
                  pointerEvents: 'none',
                  flexShrink: 0
                }} />
                <span style={{
                  color: 'var(--p-color-text)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  pointerEvents: 'none'
                }}>
                  {styles?.backgroundColor || '#FFFFFF'}
                </span>
              </div>
            </div>
          </Box>
          <Box style={{ marginTop: '16px' }}>
            <Text as="label" variant="bodyMd" fontWeight="medium">
              Border Color
            </Text>
            <div style={{ 
              marginTop: '8px',
              position: 'relative',
              width: '100%',
              maxWidth: '200px'
            }}>
              <div style={{ 
                position: 'relative',
                height: '40px',
                borderRadius: 'var(--p-border-radius-200)',
                border: '1px solid var(--p-color-border-subdued)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                backgroundColor: '#FFFFFF'
              }}>
                <input
                  type="color"
                  value={styles?.borderColor || '#C9A876'}
                  onChange={(e) => updateStyles('borderColor', e.target.value)}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    margin: 0,
                    padding: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                />
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: '1px solid var(--p-color-border-subdued)',
                  backgroundColor: styles?.borderColor || '#C9A876',
                  pointerEvents: 'none',
                  flexShrink: 0
                }} />
                <span style={{
                  color: 'var(--p-color-text)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  pointerEvents: 'none'
                }}>
                  {styles?.borderColor || '#C9A876'}
                </span>
              </div>
            </div>
          </Box>
          <Box style={{ marginTop: '16px' }}>
            <Text as="label" variant="bodyMd" fontWeight="medium">
              Text Color
            </Text>
            <div style={{ 
              marginTop: '8px',
              position: 'relative',
              width: '100%',
              maxWidth: '200px'
            }}>
              <div style={{ 
                position: 'relative',
                height: '40px',
                borderRadius: 'var(--p-border-radius-200)',
                border: '1px solid var(--p-color-border-subdued)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                backgroundColor: '#FFFFFF'
              }}>
                <input
                  type="color"
                  value={styles?.textColor || '#000000'}
                  onChange={(e) => updateStyles('textColor', e.target.value)}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    margin: 0,
                    padding: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                />
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: '1px solid var(--p-color-border-subdued)',
                  backgroundColor: styles?.textColor || '#000000',
                  pointerEvents: 'none',
                  flexShrink: 0
                }} />
                <span style={{
                  color: 'var(--p-color-text)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  pointerEvents: 'none'
                }}>
                  {styles?.textColor || '#000000'}
                </span>
              </div>
            </div>
          </Box>
          <Box style={{ marginTop: '16px' }}>
            <Text as="label" variant="bodyMd" fontWeight="medium">
              URL Color
            </Text>
            <div style={{ 
              marginTop: '8px',
              position: 'relative',
              width: '100%',
              maxWidth: '200px'
            }}>
              <div style={{ 
                position: 'relative',
                height: '40px',
                borderRadius: 'var(--p-border-radius-200)',
                border: '1px solid var(--p-color-border-subdued)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                backgroundColor: '#FFFFFF'
              }}>
                <input
                  type="color"
                  value={styles?.urlColor || '#000000'}
                  onChange={(e) => updateStyles('urlColor', e.target.value)}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    margin: 0,
                    padding: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                />
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: '1px solid var(--p-color-border-subdued)',
                  backgroundColor: styles?.urlColor || '#000000',
                  pointerEvents: 'none',
                  flexShrink: 0
                }} />
                <span style={{
                  color: 'var(--p-color-text)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  pointerEvents: 'none'
                }}>
                  {styles?.urlColor || '#000000'}
                </span>
              </div>
            </div>
          </Box>
          </>
        )}

        {layouts?.selectedLayout !== 'layout-3' && (
          <TextField
            label="Background image URL"
            value={styles.backgroundImageUrl ?? ''}
            onChange={(value) => updateStyles('backgroundImageUrl', value.trim())}
            placeholder="https://cdn.shopify.com/sample-background.jpg"
            autoComplete="off"
          />
        )}

        {layouts?.selectedLayout === 'layout-1' && (
          <Box style={{ marginTop: '16px' }}>
            <Text as="label" variant="bodyMd" fontWeight="medium">
              Title size
            </Text>
            <Box style={{ marginTop: '8px' }}>
              <TextField
                label=""
                type="number"
                value={styles?.titleSize || ''}
                onChange={(value) => {
                  const numValue = parseInt(value, 10);
                  if (value === '' || (!isNaN(numValue) && numValue >= 1 && numValue <= 100)) {
                    updateStyles('titleSize', value);
                  }
                }}
                placeholder="Enter font size in pixels (e.g., 20)"
                autoComplete="off"
                min="1"
                max="100"
              />
            </Box>
          </Box>
        )}

        {layouts?.selectedLayout === 'layout-1' && (
          <Box style={{ marginTop: '16px' }}>
            <Text as="label" variant="bodyMd" fontWeight="medium">
              Title Color
            </Text>
            <div style={{ 
              marginTop: '8px',
              position: 'relative',
              width: '100%',
              maxWidth: '200px'
            }}>
              <div style={{ 
                position: 'relative',
                height: '40px',
                borderRadius: 'var(--p-border-radius-200)',
                border: '1px solid var(--p-color-border-subdued)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                backgroundColor: '#FFFFFF'
              }}>
                <input
                  type="color"
                  value={styles?.textColor || '#FFFFFF'}
                  onChange={(e) => updateStyles('textColor', e.target.value)}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    margin: 0,
                    padding: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                />
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: '1px solid var(--p-color-border-subdued)',
                  backgroundColor: styles?.textColor || '#FFFFFF',
                  pointerEvents: 'none',
                  flexShrink: 0
                }} />
                <span style={{
                  color: 'var(--p-color-text)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  pointerEvents: 'none'
                }}>
                  {styles?.textColor || '#FFFFFF'}
                </span>
              </div>
            </div>
          </Box>
        )}

        {layouts?.selectedLayout === 'layout-1' && (
          <Box style={{ marginTop: '16px' }}>
            <Text as="label" variant="bodyMd" fontWeight="medium">
              Description size
            </Text>
            <Box style={{ marginTop: '8px' }}>
              <TextField
                label=""
                type="number"
                value={styles?.descriptionSize || ''}
                onChange={(value) => {
                  const numValue = parseInt(value, 10);
                  if (value === '' || (!isNaN(numValue) && numValue >= 1 && numValue <= 100)) {
                    updateStyles('descriptionSize', value);
                  }
                }}
                placeholder="Enter font size in pixels (e.g., 16)"
                autoComplete="off"
                min="1"
                max="100"
              />
            </Box>
          </Box>
        )}

        {layouts?.selectedLayout === 'layout-1' && (
          <Box style={{ marginTop: '16px' }}>
            <Text as="label" variant="bodyMd" fontWeight="medium">
              Description Color
            </Text>
            <div style={{ 
              marginTop: '8px',
              position: 'relative',
              width: '100%',
              maxWidth: '200px'
            }}>
              <div style={{ 
                position: 'relative',
                height: '40px',
                borderRadius: 'var(--p-border-radius-200)',
                border: '1px solid var(--p-color-border-subdued)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                backgroundColor: '#FFFFFF'
              }}>
                <input
                  type="color"
                  value={layouts?.descriptionColor || '#F9E3D7'}
                  onChange={(e) => updateLayouts('descriptionColor', e.target.value)}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    margin: 0,
                    padding: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                />
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: '1px solid var(--p-color-border-subdued)',
                  backgroundColor: layouts?.descriptionColor || '#F9E3D7',
                  pointerEvents: 'none',
                  flexShrink: 0
                }} />
                <span style={{
                  color: 'var(--p-color-text)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  pointerEvents: 'none'
                }}>
                  {layouts?.descriptionColor || '#F9E3D7'}
                </span>
              </div>
            </div>
          </Box>
        )}

        {layouts?.selectedLayout === 'layout-1' && (
          <Box style={{ marginTop: '16px' }}>
            <Text as="label" variant="bodyMd" fontWeight="medium">
              Discount Color
            </Text>
            <div style={{ 
              marginTop: '8px',
              position: 'relative',
              width: '100%',
              maxWidth: '200px'
            }}>
              <div style={{ 
                position: 'relative',
                height: '40px',
                borderRadius: 'var(--p-border-radius-200)',
                border: '1px solid var(--p-color-border-subdued)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                backgroundColor: '#FFFFFF'
              }}>
                <input
                  type="color"
                  value={layouts?.discountColor || '#FFFFFF'}
                  onChange={(e) => updateLayouts('discountColor', e.target.value)}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    margin: 0,
                    padding: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                />
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: '1px solid var(--p-color-border-subdued)',
                  backgroundColor: layouts?.discountColor || '#FFFFFF',
                  pointerEvents: 'none',
                  flexShrink: 0
                }} />
                <span style={{
                  color: 'var(--p-color-text)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  pointerEvents: 'none'
                }}>
                  {layouts?.discountColor || '#FFFFFF'}
                </span>
              </div>
            </div>
          </Box>
        )}

        {layouts?.selectedLayout === 'layout-1' && (
          <Box style={{ marginTop: '16px' }}>
            <Text as="label" variant="bodyMd" fontWeight="medium">
              Disclaimer Color
            </Text>
            <div style={{ 
              marginTop: '8px',
              position: 'relative',
              width: '100%',
              maxWidth: '200px'
            }}>
              <div style={{ 
                position: 'relative',
                height: '40px',
                borderRadius: 'var(--p-border-radius-200)',
                border: '1px solid var(--p-color-border-subdued)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                backgroundColor: '#FFFFFF'
              }}>
                <input
                  type="color"
                  value={layouts?.disclaimerColor || '#2B1A11'}
                  onChange={(e) => updateLayouts('disclaimerColor', e.target.value)}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    margin: 0,
                    padding: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                />
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: '1px solid var(--p-color-border-subdued)',
                  backgroundColor: layouts?.disclaimerColor || '#2B1A11',
                  pointerEvents: 'none',
                  flexShrink: 0
                }} />
                <span style={{
                  color: 'var(--p-color-text)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  pointerEvents: 'none'
                }}>
                  {layouts?.disclaimerColor || '#2B1A11'}
                </span>
              </div>
            </div>
          </Box>
        )}

        {layouts?.selectedLayout === 'layout-1' && (
          <Box style={{ marginTop: '16px' }}>
            <Text as="label" variant="bodyMd" fontWeight="medium">
              Button Color
            </Text>
            <div style={{ 
              marginTop: '8px',
              position: 'relative',
              width: '100%',
              maxWidth: '200px'
            }}>
              <div style={{ 
                position: 'relative',
                height: '40px',
                borderRadius: 'var(--p-border-radius-200)',
                border: '1px solid var(--p-color-border-subdued)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                backgroundColor: '#FFFFFF'
              }}>
                <input
                  type="color"
                  value={layouts?.buttonColor || '#D4A574'}
                  onChange={(e) => updateLayouts('buttonColor', e.target.value)}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    margin: 0,
                    padding: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                />
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: '1px solid var(--p-color-border-subdued)',
                  backgroundColor: layouts?.buttonColor || '#D4A574',
                  pointerEvents: 'none',
                  flexShrink: 0
                }} />
                <span style={{
                  color: 'var(--p-color-text)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  pointerEvents: 'none'
                }}>
                  {layouts?.buttonColor || '#D4A574'}
                </span>
              </div>
            </div>
          </Box>
        )}

        {layouts?.selectedLayout !== 'layout-3' && layouts?.selectedLayout !== 'layout-1' && (
          <Box
            className="flex flex-col gap-3"
            style={{
              marginTop: '10px',
            }}
          >
            <Text
              variant="headingSm"
              as="h3"
              style={{
                marginBottom: '20px',
              }}
            >
                Templates
              </Text>

              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '16px',
                  marginTop: '10px',
                }}
              >
                  {BANNER_TEMPLATES.map(({id, label, preview}) => {
                    const isSelected = styles.selectedTemplate === id;

                    const handleSelect = () => updateStyles('selectedTemplate', id);
                    const handleKeyDown = (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        updateStyles('selectedTemplate', id);
                      }
                    };

                    return (
                      <Box
                        key={id}
                        role="button"
                        tabIndex={0}
                        onClick={handleSelect}
                        onKeyDown={handleKeyDown}
                        aria-pressed={isSelected}
                        className="rounded-2xl border bg-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        style={{
                          borderColor: isSelected
                            ? 'var(--p-color-border-strong)'
                            : 'var(--p-color-border-subdued)',
                          boxShadow: isSelected
                            ? '0 6px 16px rgba(15, 118, 110, 0.18)'
                            : '0 2px 6px rgba(15, 23, 42, 0.05)',
                        }}
                      >
                        <Box className="px-4 pt-4">
                          <Box
                            className="rounded-xl overflow-hidden"
                            style={{
                              backgroundColor: preview.background,
                              border: `1px solid rgba(15, 23, 42, 0.06)`,
                              padding: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                            }}
                          >
                            <Box className="flex items-center gap-3">
                              <Box
                                style={{
                                  width: '46px',
                                  height: '46px',
                                  borderRadius: '12px',
                                  backgroundColor: preview.accent,
                                }}
                              />
                              <Box className="flex-1" />
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
          </Box>
        )}

      </Box>
    </Card>
    ] : []),
  ];

  return (
    <Box className="w-full">
      <Card>
        <Box className="p-6 max-w-[720px]">
          <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
            <Box className="mt-6" id={tabs[selectedTab].panelID}>
              {tabPanels[selectedTab]}
            </Box>
          </Tabs>
        </Box>
      </Card>
    </Box>
  );
}
