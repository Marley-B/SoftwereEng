import { useCallback, useState } from "react";

import type { AuthStep } from "./types";
import { SignInScreen } from "./screens/SignInScreen";
import { SignUpScreen } from "./screens/SignUpScreen";

/** Lightweight step switching — swap for expo-router stacks when routes grow. */
export function AuthNavigator() {
  const [step, setStep] = useState<AuthStep>("signIn");

  const goSignIn = useCallback(() => {
    setStep("signIn");
  }, []);
  const goSignUp = useCallback(() => {
    setStep("signUp");
  }, []);

  switch (step) {
    case "signUp":
      return (
        <SignUpScreen onBack={goSignIn} onHaveAccount={goSignIn} />
      );
    default:
      return (
        <SignInScreen onNeedAccount={goSignUp} />
      );
  }
}
