"use client";

import { useDeployment } from "@wacht/nextjs";
import { useEffect } from "react";

export function DeploymentStyling() {
    const { deployment } = useDeployment();

    useEffect(() => {
        console.log("Deployment data:", deployment);
        console.log("UI Settings:", deployment?.ui_settings);

        if (!deployment?.ui_settings?.dark_mode_settings) {
            console.log("No dark mode settings found");
            return;
        }

        const { primary_color, background_color, text_color } =
            deployment.ui_settings.dark_mode_settings;

        console.log("Applying colors:", { primary_color, background_color, text_color });

        const root = document.documentElement;

        // Helper to set variable if value exists
        const setVar = (name: string, value: string) => {
            if (value) root.style.setProperty(name, value);
        };

        // Apply Dark Mode Settings (since we are dark-first)
        // We map deployment branding to our existing Tailwind variables

        // Deployment Primary -> Button backgrounds, accents?
        // Currently --sidebar-accent is used for some highlights.
        // Maybe we map primary_color to a new --primary variable or override existing accents
        // For now, let's just log or set a --brand-primary

        // Intelligent Mapping (Revised)
        // Now that the user has corrected the DB data:
        // background_color = Main Background (e.g. #211f1d)
        // primary_color = Brand/Accent Color (e.g. #8B94FF or #2A2A2A depending on config)
        // But currently primary is #2A2A2A (Dark) and Background is #211f1d (Darker).

        // 1. Trust the Background Color from Deployment
        if (background_color) {
            setVar("--background", background_color);
            setVar("--sidebar", background_color);
            // Or we can keep sidebar distinct if we want, but usually matching looks cleanest in this app
        }

        // 2. Use Primary Color for Accents/Highlights
        if (primary_color) {
            // If primary is also dark gray, it might not be visible as an accent on dark background.
            // But we must respect the data.
            setVar("--sidebar-accent", primary_color);
            setVar("--primary", primary_color);
        }

        if (text_color) {
            setVar("--foreground", text_color);
        }
    }, [deployment]);

    return null;
}
