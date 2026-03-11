"use client";

import { useDeployment } from "@wacht/nextjs";
import { useEffect } from "react";

const lightTokenMap = {
  card: "--theme-light-card",
  card_foreground: "--theme-light-card-foreground",
  popover: "--theme-light-popover",
  popover_foreground: "--theme-light-popover-foreground",
  primary_foreground: "--theme-light-primary-foreground",
  secondary: "--theme-light-secondary",
  secondary_foreground: "--theme-light-secondary-foreground",
  accent: "--theme-light-accent",
  accent_foreground: "--theme-light-accent-foreground",
  ring: "--theme-light-ring",
  foreground: "--theme-light-foreground",
  secondary_text: "--theme-light-muted-foreground",
  muted: "--theme-light-muted",
  border: "--theme-light-border",
  input_background: "--theme-light-input-background",
  input_border: "--theme-light-input",
  background_subtle: "--theme-light-secondary",
  background_hover: "--theme-light-accent",
  error: "--theme-light-destructive",
  radius_lg: "--theme-global-radius-lg",
  scrollbar_track: "--theme-scrollbar-track",
  scrollbar_thumb: "--theme-scrollbar-thumb",
  scrollbar_thumb_hover: "--theme-scrollbar-thumb-hover",
} as const;

const darkTokenMap = {
  card: "--theme-dark-card",
  card_foreground: "--theme-dark-card-foreground",
  popover: "--theme-dark-popover",
  popover_foreground: "--theme-dark-popover-foreground",
  primary_foreground: "--theme-dark-primary-foreground",
  secondary: "--theme-dark-secondary",
  secondary_foreground: "--theme-dark-secondary-foreground",
  accent: "--theme-dark-accent",
  accent_foreground: "--theme-dark-accent-foreground",
  ring: "--theme-dark-ring",
  foreground: "--theme-dark-foreground",
  secondary_text: "--theme-dark-muted-foreground",
  muted: "--theme-dark-muted",
  border: "--theme-dark-border",
  input_background: "--theme-dark-input-background",
  input_border: "--theme-dark-input",
  background_subtle: "--theme-dark-secondary",
  background_hover: "--theme-dark-accent",
  error: "--theme-dark-destructive",
  radius_lg: "--theme-global-radius-lg",
  scrollbar_track: "--theme-scrollbar-track",
  scrollbar_thumb: "--theme-scrollbar-thumb",
  scrollbar_thumb_hover: "--theme-scrollbar-thumb-hover",
} as const;

type ThemeOverrideKey = keyof typeof lightTokenMap | keyof typeof darkTokenMap;

type ThemeModeSettings = {
  primary_color?: string | null;
  background_color?: string | null;
  text_color?: string | null;
  token_overrides?: Partial<Record<ThemeOverrideKey, string>> | null;
};

function setStyleVar(style: CSSStyleDeclaration, key: string, value?: string | null) {
  if (value && value.trim()) {
    style.setProperty(key, value.trim());
    return;
  }
  style.removeProperty(key);
}

export function DeploymentStyling() {
  const { deployment } = useDeployment();

  useEffect(() => {
    const style = document.documentElement.style;
    const light = deployment?.ui_settings?.light_mode_settings as ThemeModeSettings | undefined;
    const dark = deployment?.ui_settings?.dark_mode_settings as ThemeModeSettings | undefined;

    setStyleVar(style, "--theme-light-primary", light?.primary_color);
    setStyleVar(style, "--theme-light-background", light?.background_color);
    setStyleVar(style, "--theme-light-foreground", light?.token_overrides?.foreground || light?.text_color);

    setStyleVar(style, "--theme-dark-primary", dark?.primary_color);
    setStyleVar(style, "--theme-dark-background", dark?.background_color);
    setStyleVar(style, "--theme-dark-foreground", dark?.token_overrides?.foreground || dark?.text_color);

    setStyleVar(style, "--theme-global-radius-lg", light?.token_overrides?.radius_lg || dark?.token_overrides?.radius_lg);

    for (const [token, variable] of Object.entries(lightTokenMap)) {
      const value = light?.token_overrides?.[token as keyof typeof lightTokenMap];
      setStyleVar(style, variable, value);
    }

    for (const [token, variable] of Object.entries(darkTokenMap)) {
      const value = dark?.token_overrides?.[token as keyof typeof darkTokenMap];
      setStyleVar(style, variable, value);
    }
  }, [deployment]);

  return null;
}
