export const DEFAULT_BANNER_SETTINGS = {
  goal: {
    popupSelection: ["collect-email"],
    popupTitle: "Welcome discount",
    popupDescription: "Share a short message to encourage sign-ups.",
    subscriptionType: ["email"],
    emailLabel: "Your email address",
    buttonText: "Add",
    successMessage:
      "Congratulations! You've successfully joined our list. Stay tuned for updates.",
    discountCode: "",
  },
  countdown: {
    isCountdownEnabled: false,
    countdownType: ["specific-end-date"],
    countdownEndDate: "",
    countdownEndTime: "",
    loopIntervalDays: "",
    loopIntervalHours: "",
    loopIntervalMinutes: "",
    daysLabel: "Days",
    hoursLabel: "Hours",
    minutesLabel: "Mins",
    secondsLabel: "Secs",
  },
  styles: {
    popoutLayout: ["image-left"],
    backgroundImageUrl: "",
    selectedTemplate: "template-1",
    backgroundColor: "#FFFFFF",
    borderColor: "#C9A876",
    textColor: "#000000",
    urlColor: "#000000",
    titleSize: "",
    descriptionSize: "",
  },
  layouts: {
    triggerTime: "0",
    repeatAfter: "0",
    selectedLayout: "layout-1",
    discountPercentage: "",
    description: "",
    buttonText: "",
    buttonUrl: "",
    imageSource: "upload",
    imageUrl: "",
    disclaimer: "",
    borderSize: "1",
    text: "",
    discountText: "",
    brandName: "",
    urlName: "",
    layout3ImageUrl: "",
    showBannerTo: "homepage",
    layout4PreviewImageUrl: "",
    layout4PageLink: "",
    layout4ShowBannerTo: "homepage",
  },
};

export function applyBannerSettingsDefaults(settings = {}) {
  const merged = {
    goal: { ...DEFAULT_BANNER_SETTINGS.goal, ...(settings.goal || {}) },
    countdown: {
      ...DEFAULT_BANNER_SETTINGS.countdown,
      ...(settings.countdown || {}),
    },
    styles: { ...DEFAULT_BANNER_SETTINGS.styles, ...(settings.styles || {}) },
    layouts: {
      ...DEFAULT_BANNER_SETTINGS.layouts,
      ...(settings.layouts || {}),
    },
  };

  merged.goal.popupSelection =
    merged.goal.popupSelection && merged.goal.popupSelection.length
      ? merged.goal.popupSelection
      : DEFAULT_BANNER_SETTINGS.goal.popupSelection.slice();

  merged.goal.subscriptionType =
    merged.goal.subscriptionType && merged.goal.subscriptionType.length
      ? merged.goal.subscriptionType
      : DEFAULT_BANNER_SETTINGS.goal.subscriptionType.slice();

  merged.countdown.countdownType =
    merged.countdown.countdownType && merged.countdown.countdownType.length
      ? merged.countdown.countdownType
      : DEFAULT_BANNER_SETTINGS.countdown.countdownType.slice();

  merged.styles.popoutLayout =
    merged.styles.popoutLayout && merged.styles.popoutLayout.length
      ? merged.styles.popoutLayout
      : DEFAULT_BANNER_SETTINGS.styles.popoutLayout.slice();

  return merged;
}


