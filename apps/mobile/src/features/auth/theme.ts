/** Mobile-first auth surface tokens (spacing tuned for thumb reach & readability). */
export const authTheme = {
  colors: {
    background: "#eef2f6",
    border: "#d8dee9",
    danger: "#b91c1c",
    dangerMuted: "#fecaca",
    foreground: "#0f172a",
    muted: "#64748b",
    onPrimary: "#ffffff",
    placeholder: "#94a3b8",
    primary: "#0d9488",
    primaryPressed: "#0f766e",
    surface: "#ffffff",
  },
  radii: {
    control: 14,
    screen: 20,
  },
  space: {
    lg: 24,
    md: 16,
    sm: 12,
    xl: 32,
    xs: 8,
  },
  typography: {
    body: 15,
    caption: 14,
    headline: 30,
    label: 15,
    subhead: 18,
    title: 20,
  },
} as const;
