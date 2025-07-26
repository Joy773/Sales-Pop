import { useState } from "react";
import { Onboarding } from "../components/Onboarding";

export default function Index() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  return showOnboarding ? (
    <Onboarding onSkip={handleOnboardingComplete} />
  ) : null;
}
