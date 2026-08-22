import { useSetAtom } from "jotai";
import React, { useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { loadSettingsAtom } from "@/lib/atoms";

const SettingsLoader = (): React.JSX.Element => {
  const load = useSetAtom(loadSettingsAtom);
  useEffect(() => {
    void load();
  }, [load]);
  return <AppLayout />;
};

const App = (): React.JSX.Element => (
  <ErrorBoundary context="root">
    <SettingsLoader />
  </ErrorBoundary>
);

export default App;
