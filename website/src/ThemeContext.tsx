import { createContext, useContext, useCallback } from "react";
import { DEFAULT_PALETTE, MOOD_PALETTES, type MoodPalette } from "./palettes";

interface ThemeContextValue {
  setPalette: (name: string) => void;
  resetPalette: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  setPalette: () => {},
  resetPalette: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const applyPalette = useCallback((p: MoodPalette) => {
    const r = document.documentElement;
    r.style.setProperty("--site-bg", p.bg);
    r.style.setProperty("--site-bg-secondary", p.bgSecondary);
    r.style.setProperty("--site-card", p.card);
    r.style.setProperty("--site-card-border", p.cardBorder);
    r.style.setProperty("--site-text", p.text);
    r.style.setProperty("--site-text-secondary", p.textSecondary);
    r.style.setProperty("--site-accent-from", p.accentFrom);
    r.style.setProperty("--site-accent-to", p.accentTo);
    r.style.setProperty("--site-orb-a", p.orbA);
    r.style.setProperty("--site-orb-b", p.orbB);
    r.style.setProperty("--site-icon-bg", p.iconBg);
    r.style.setProperty("--site-terminal-bg", p.terminalBg);
    r.style.setProperty("--site-terminal-prompt", p.terminalPrompt);
    r.style.setProperty("--site-terminal-keyword", p.terminalKeyword);
    r.style.setProperty("--site-terminal-comment", p.terminalComment);
  }, []);

  const setPalette = useCallback(
    (name: string) => {
      const p = MOOD_PALETTES.find((m) => m.name === name);
      if (p) applyPalette(p);
    },
    [applyPalette],
  );

  const resetPalette = useCallback(() => {
    applyPalette(DEFAULT_PALETTE);
  }, [applyPalette]);

  return (
    <ThemeContext.Provider value={{ setPalette, resetPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
