import { useAtomValue, useSetAtom } from "jotai";
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import Dropdown from "@/components/settings/Dropdown";
import {
  defaultGroupsAtom,
  defaultAppsLoadingAtom,
  loadDefaultAppsAtom,
  setDefaultAppAtom,
} from "@/stores";

const initialsFor = (name: string): string =>
  name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const AppChip = ({ name }: { readonly name: string }): React.JSX.Element => (
  <div
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-bold text-white shadow-md"
    style={{
      background:
        "linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 45%, #a855f7))",
    }}
  >
    {initialsFor(name) || "?"}
  </div>
);

const DefaultAppsPage = (): React.JSX.Element => {
  const groups = useAtomValue(defaultGroupsAtom);
  const loading = useAtomValue(defaultAppsLoadingAtom);
  const loadGroups = useSetAtom(loadDefaultAppsAtom);
  const setDefault = useSetAtom(setDefaultAppAtom);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-7 pt-6 pb-2">
          <h1 className="text-[24px] font-bold text-text-header tracking-tight">Default Apps</h1>
          <p className="text-[12px] text-text-subtitle mt-0.5">
            Choose which application opens each kind of content.
          </p>
        </div>

        <div className="flex flex-col gap-6 p-7">
          <SettingsGroup header="Associations" accent="var(--color-accent)">
            {loading && groups.length === 0 && (
              <div className="flex items-center gap-2 p-4 text-[12px] text-text-subtitle">
                <Loader2 size={14} className="animate-spin" />
                Detecting applications…
              </div>
            )}
            {!loading && groups.length === 0 && (
              <div className="p-4 text-[12px] text-text-subtitle">
                No application categories could be detected.
              </div>
            )}
            {groups.map((group) => {
              const candidates = group.candidates;
              const currentApp = candidates.find((app) => `${app.id}.desktop` === group.current);
              const displayName = currentApp?.name ?? group.current.replace(/\.desktop$/, "");
              const options = candidates.map((app) => ({
                value: `${app.id}.desktop`,
                label: app.name,
                description: app.comment || undefined,
              }));
              const value =
                options.find((option) => option.value === group.current)?.value ?? group.current;

              return (
                <SettingsRow
                  key={group.id}
                  title={group.label}
                  description={
                    currentApp?.comment ?? (group.current === "" ? "No default set" : undefined)
                  }
                >
                  <div className="flex items-center gap-3">
                    {currentApp && <AppChip name={currentApp.name} />}
                    {!currentApp && group.current !== "" && (
                      <span className="text-[11px] text-text-subtitle font-mono max-w-44 truncate">
                        {displayName}
                      </span>
                    )}
                    <Dropdown
                      value={value}
                      onChange={(desktopId): void => {
                        if (desktopId !== "") {
                          void setDefault({ group: group.id, desktopId });
                        }
                      }}
                      placeholder={group.current === "" ? "No default" : displayName}
                      disabled={options.length === 0}
                      className="min-w-40"
                      options={options}
                    />
                  </div>
                </SettingsRow>
              );
            })}
          </SettingsGroup>

          <p className="text-[11px] text-text-muted px-1 leading-relaxed">
            Changes are applied system-wide via xdg-mime and take effect for newly opened files and
            links.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default DefaultAppsPage;
