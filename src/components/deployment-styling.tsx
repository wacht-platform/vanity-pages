"use client";

import { useDeployment } from "@wacht/nextjs";
import { useEffect } from "react";

export function DeploymentStyling() {
  const { deployment } = useDeployment();

  useEffect(() => {
    if (!deployment?.ui_settings?.dark_mode_settings) {
      return;
    }

    // Don't override theme CSS variables - the radix-mira theme handles theming
    // We could apply brand-specific colors here if needed in the future
  }, [deployment]);

  return null;
}
