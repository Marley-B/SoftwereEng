import { useCallback, useState } from "react";

import type { AuthStep } from "./types";
import { SignInScreen } from "./screens/SignInScreen";
import { SignUpScreen } from "./screens/SignUpScreen";
import { WelcomeScreen } from "./screens/WelcomeScreen";

/** Lightweight step switching — swap for expo-router stacks when routes grow. */
export function AuthNavigator() {
  const [step, setStep] = useState<AuthStep>("welcome");

  const goWelcome = useCallback(() => {
    setStep("welcome");
  }, []);
  const goSignIn = useCallback(() => {
    setStep("signIn");
  }, []);
  const goSignUp = useCallback(() => {
    setStep("signUp");
  }, []);

  switch (step) {
    case "signIn":
      return (
        <SignInScreen onBack={goWelcome} onNeedAccount={goSignUp} />
      );
    case "signUp":
      return (
        <SignUpScreen onBack={goWelcome} onHaveAccount={goSignIn} />
      );
    default:
      return (
        <WelcomeScreen onCreateAccount={goSignUp} onSignIn={goSignIn} />
      );
  }
}
