// Theme presets for the respondent experience (and the builder canvas).
// A form stores only the preset key in settings.theme.preset; the colors
// live here and are applied as CSS variables on the form wrapper.

export interface Theme {
  name: string;
  background: string;
  question: string; // title text
  answer: string; // accent: inputs, choices, buttons, progress bar
  button: string;
  buttonText: string;
}

export const THEMES: Record<string, Theme> = {
  default: {
    name: "Classic",
    background: "#FFFFFF",
    question: "#191919",
    answer: "#0445AF",
    button: "#0445AF",
    buttonText: "#FFFFFF",
  },
  midnight: {
    name: "Midnight",
    background: "#16182B",
    question: "#FFFFFF",
    answer: "#9EC0FF",
    button: "#9EC0FF",
    buttonText: "#16182B",
  },
  forest: {
    name: "Forest",
    background: "#E8F0E6",
    question: "#1E3A2A",
    answer: "#2F7A4E",
    button: "#2F7A4E",
    buttonText: "#FFFFFF",
  },
  peach: {
    name: "Peach",
    background: "#FFEDE3",
    question: "#43231A",
    answer: "#C2410C",
    button: "#C2410C",
    buttonText: "#FFFFFF",
  },
  lavender: {
    name: "Lavender",
    background: "#EFEAFB",
    question: "#2B1F4A",
    answer: "#6D4BC9",
    button: "#6D4BC9",
    buttonText: "#FFFFFF",
  },
};

export function getTheme(preset?: string): Theme {
  return THEMES[preset ?? "default"] ?? THEMES.default;
}

/** Hex color with alpha, for tinted choice backgrounds and borders. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** CSS variables consumed by the respondent components. */
export function themeVars(theme: Theme): React.CSSProperties {
  return {
    "--q-bg": theme.background,
    "--q-text": theme.question,
    "--q-accent": theme.answer,
    "--q-accent-10": withAlpha(theme.answer, 0.1),
    "--q-accent-20": withAlpha(theme.answer, 0.2),
    "--q-accent-30": withAlpha(theme.answer, 0.3),
    "--q-accent-60": withAlpha(theme.answer, 0.6),
    "--q-btn": theme.button,
    "--q-btn-text": theme.buttonText,
  } as React.CSSProperties;
}
