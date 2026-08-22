import { useAtom, useSetAtom } from "jotai";
import React, { useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { loadSettingsAtom, appearanceAtom } from "@/lib/atoms";
import { loadThemeColorsAtom, pywalThemeAtom, applyThemeToDOM } from "@/lib/themeAtoms";

const SettingsLoader = (): React.JSX.Element => {
  const loadSettings = useSetAtom(loadSettingsAtom);
  const loadTheme = useSetAtom(loadThemeColorsAtom);
  const [appearance] = useAtom(appearanceAtom);
  const [pywalTheme] = useAtom(pywalThemeAtom);

  useEffect(() => {
    void loadSettings();
    void loadTheme();
  }, [loadSettings, loadTheme]);

  useEffect(() => {
    applyThemeToDOM(pywalTheme, appearance);
  }, [appearance, pywalTheme]);

  return <AppLayout />;
};

const App = (): React.JSX.Element => (
  <ErrorBoundary context="root">
    <SettingsLoader />
  </ErrorBoundary>
);

export default App;
