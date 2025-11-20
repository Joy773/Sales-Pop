import {useState} from 'react';
import {
  Box,
  Card,
  Checkbox,
  ChoiceList,
  FormLayout,
  Tabs,
  Text,
  TextField,
} from '@shopify/polaris';
import {BANNER_TEMPLATES} from './bannerTemplates';

const tabs = [
  {id: 'goal', content: 'Goal', panelID: 'goal-content'},
  {id: 'styles', content: 'Styles', panelID: 'styles-content'},
  {id: 'behavior', content: 'Behavior', panelID: 'behavior-content'},
];

export default function BannerTabSection({settings, onSettingsChange}) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [showTemplates, setShowTemplates] = useState(true);
  const {goal, countdown, styles, behavior} = settings;

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

  const updateBehavior = (field, value) =>
    onSettingsChange((prev) => ({
      ...prev,
      behavior: {...prev.behavior, [field]: value},
    }));

  const handleTabChange = (selectedIndex) => setSelectedTab(selectedIndex);

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
        <ChoiceList
          title="Choose your popup"
          selected={goal.popupSelection}
          choices={[
            {label: 'Collect email/phone', value: 'collect-email'},
            {label: 'Offer discount coupon', value: 'offer-discount'},
            {label: 'Subscribe to show discount code', value: 'subscribe-discount'},
            {label: 'Announcement', value: 'announcement'},
          ]}
          onChange={(value) => updateGoal('popupSelection', value)}
        />

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
                href="https://admin.shopify.com/store/{shop}/discounts"
                target="_blank"
                rel="noopener noreferrer"
              >
                Shopify Discounts
              </a>
            </Text>
          </Box>
        )}

        {goal.popupSelection[0] !== 'offer-discount' && (
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
      </Box>
    </Card>
  );

  const tabPanels = [
    goalTabContent,
    <Card key="styles" sectioned>
      <Box className="flex flex-col gap-6 pt-2">
       
        <ChoiceList
          title="Popout layout"
          selected={styles.popoutLayout}
          choices={[
            {label: 'Image left', value: 'image-left'},
            {label: 'Image right', value: 'image-right'},
          ]}
          onChange={(value) => updateStyles('popoutLayout', value)}
        />

        <Box className="flex flex-col gap-3">
          <Box className="flex items-center gap-1 w-fit">
            <Text variant="headingSm" as="h3">
              Templates
            </Text>
            <button
              type="button"
              onClick={() => setShowTemplates((prev) => !prev)}
              className="flex items-center justify-center w-8 h-8 text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary border border-transparent hover:border-primary-200 rounded-full transition"
              aria-expanded={showTemplates}
              aria-label={showTemplates ? 'Collapse templates' : 'Expand templates'}
            >
              <span
                aria-hidden="true"
                className="inline-block"
                style={{transform: showTemplates ? 'rotate(180deg)' : 'rotate(0deg)'}}
              >
                ▾
              </span>
            </button>
          </Box>

          {showTemplates && (
            <Box className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
                          <Box className="flex-1 flex flex-col gap-2">
                            <Box
                              style={{
                                height: '6px',
                                borderRadius: '999px',
                                backgroundColor: preview.title,
                              }}
                            />
                            <Box
                              style={{
                                height: '6px',
                                borderRadius: '999px',
                                width: '70%',
                                backgroundColor: preview.subtitle,
                              }}
                            />
                            <Box
                              style={{
                                height: '6px',
                                borderRadius: '999px',
                                width: '45%',
                                backgroundColor: preview.cta,
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                    <Box className="px-4 py-3 border-t border-slate-200/80">
                      <Text as="span" variant="bodySm">
                        {label}
                      </Text>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        <TextField
          label="Background image URL"
          value={styles.backgroundImageUrl ?? ''}
          onChange={(value) => updateStyles('backgroundImageUrl', value.trim())}
          placeholder="https://cdn.shopify.com/sample-background.jpg"
          autoComplete="off"
        />

      </Box>
    </Card>,
    <Card key="behavior" sectioned>
      <Box className="flex flex-col gap-6 pt-2">
        <Box>
          <Text variant="headingMd" as="h2">
            Behavior
          </Text>
          <Text tone="subdued">
            Control when and how the popup appears for shoppers.
          </Text>
        </Box>
        <TextField
          label="Trigger time"
          type="number"
          min={0}
          suffix="sec"
          value={behavior.triggerTime}
          onChange={(value) => updateBehavior('triggerTime', value)}
          autoComplete="off"
        />
        <Text tone="subdued">Popup show after X seconds.</Text>
        <TextField
          label="Repeat after"
          type="number"
          min={0}
          suffix="sec"
          value={behavior.repeatAfter}
          onChange={(value) => updateBehavior('repeatAfter', value)}
          autoComplete="off"
        />
      </Box>
    </Card>,
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
