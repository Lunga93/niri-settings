import {
  appearanceAtom,
  applyThemeToDOM,
  loadCapabilitiesAtom,
  loadNetworkStatusAtom,
  loadSettingsAtom,
  loadThemeColorsAtom,
  pywalThemeAtom,
} from "@/stores";
import { useAtom, useSetAtom } from "jotai";
import React, { useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const SettingsLoader = (): React.JSX.Element => {
  const loadSettings = useSetAtom(loadSettingsAtom);
  const loadTheme = useSetAtom(loadThemeColorsAtom);
  const loadCaps = useSetAtom(loadCapabilitiesAtom);
  const loadNetwork = useSetAtom(loadNetworkStatusAtom);
  const [appearance] = useAtom(appearanceAtom);
  const [pywalTheme] = useAtom(pywalThemeAtom);

  useEffect(() => {
    void loadSettings();
    void loadTheme();
    void loadCaps();
    void loadNetwork();
  }, [loadSettings, loadTheme, loadCaps, loadNetwork]);

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
