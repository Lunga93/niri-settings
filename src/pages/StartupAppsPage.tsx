import { useAtomValue, useSetAtom } from "jotai";
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Trash2, Loader2, Zap, Search, Check, ChevronDown, Terminal } from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import ToggleSwitch from "@/components/settings/ToggleSwitch";
import IntegrationNotice from "@/components/settings/IntegrationNotice";
import {
  startupAppsAtom,
  startupRunnerAtom,
  startupLoadingAtom,
  loadStartupAppsAtom,
  toggleStartupAppAtom,
  addStartupAppAtom,
  removeStartupAppAtom,
  ensureAutostartRunnerAtom,
  installedAppsAtom,
  loadInstalledAppsAtom,
} from "@/stores";

const StartupAppsPage = (): React.JSX.Element => {
  const apps = useAtomValue(startupAppsAtom);
  const runner = useAtomValue(startupRunnerAtom);
  const loading = useAtomValue(startupLoadingAtom);
  const installed = useAtomValue(installedAppsAtom);
  const loadApps = useSetAtom(loadStartupAppsAtom);
  const loadInstalled = useSetAtom(loadInstalledAppsAtom);
  const toggleApp = useSetAtom(toggleStartupAppAtom);
  const addApp = useSetAtom(addStartupAppAtom);
  const removeApp = useSetAtom(removeStartupAppAtom);
  const fixRunner = useSetAtom(ensureAutostartRunnerAtom);

  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState("");
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [fixing, setFixing] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCommand, setCustomCommand] = useState("");

  useEffect(() => {
    void loadApps();
    void loadInstalled();
  }, [loadApps, loadInstalled]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return installed.slice(0, 12);
    }
    return installed
      .filter(
        (app) =>
          app.name.toLowerCase().includes(q) ||
          app.exec.toLowerCase().includes(q) ||
          app.id.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [installed, query]);

  const handlePick = async (
    id: string,
    name: string,
    command: string,
    comment: string,
  ): Promise<void> => {
    setAddingId(id);
    try {
      if (await addApp({ name, command, comment })) {
        setAddedIds((prev) => [...prev, id]);
      }
    } finally {
      setAddingId("");
    }
  };

  const handleFixRunner = async (): Promise<void> => {
    setFixing(true);
    try {
      await fixRunner();
    } finally {
      setFixing(false);
    }
  };

  const canAddCustom = customName.trim() !== "" && customCommand.trim() !== "";

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-7 pt-6 pb-2">
          <h1 className="text-[24px] font-bold text-text-header tracking-tight">Startup Apps</h1>
          <p className="text-[12px] text-text-subtitle mt-0.5">
            Applications launched automatically when your session starts.
          </p>
        </div>

        <div className="flex flex-col gap-6 p-7">
          {/* ── RUNNER STATUS ── */}
          {!runner.runner_installed && (
            <IntegrationNotice
              show
              title="No autostart runner installed"
              message="niri does not run XDG autostart entries by itself. Install dex (e.g. pacman -S dex) so your startup applications are launched at login."
            />
          )}
          {runner.runner_installed && !runner.runner_line_present && (
            <motion.div
              layout
              className="rounded-2xl border p-4 flex items-center justify-between gap-4"
              style={{
                borderColor: "color-mix(in srgb, var(--color-accent) 35%, transparent)",
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent)",
              }}
            >
              <div className="flex items-start gap-3">
                <Zap
                  size={15}
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--color-accent)" }}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-semibold text-text-header">
                    Autostart entries are not being launched
                  </span>
                  <span className="text-[11px] leading-relaxed text-text-body">
                    {runner.runner_installed_detail} is installed but nothing invokes it on startup.
                    Add one line to the niri config to activate all entries below.
                  </span>
                </div>
              </div>
              <button
                onClick={(): void => {
                  void handleFixRunner();
                }}
                disabled={fixing}
                className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:brightness-110 cursor-pointer"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, #a855f7))",
                }}
              >
                {fixing ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />}
                Enable autostart
              </button>
            </motion.div>
          )}

          {/* ── ENTRIES ── */}
          <SettingsGroup header="Applications" accent="var(--color-accent)">
            {loading && apps.length === 0 && (
              <div className="flex items-center gap-2 p-4 text-[12px] text-text-subtitle">
                <Loader2 size={14} className="animate-spin" />
                Reading autostart entries…
              </div>
            )}
            {!loading && apps.length === 0 && (
              <div className="p-4 text-[12px] text-text-subtitle">
                Nothing starts with your session yet — pick an app below.
              </div>
            )}
            {apps.map((app) => (
              <SettingsRow
                key={app.id}
                title={app.name}
                description={app.comment || app.command}
                hint={!app.hidden ? undefined : "Disabled"}
              >
                <div className="flex items-center gap-3">
                  <ToggleSwitch
                    checked={!app.hidden}
                    onToggle={(): void => {
                      void toggleApp(app.id);
                    }}
                  />
                  <button
                    onClick={(): void => {
                      void removeApp(app.id);
                    }}
                    title={`Remove ${app.name}`}
                    className="text-text-muted hover:text-danger transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </SettingsRow>
            ))}
          </SettingsGroup>

          {/* ── PICKER ── */}
          <SettingsGroup header="Add Application" accent="#30d158">
            <div className="p-4 flex flex-col gap-3">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtitle pointer-events-none"
                />
                <input
                  value={query}
                  onChange={(e): void => setQuery(e.target.value)}
                  placeholder="Search installed applications…"
                  className="w-full rounded-xl border border-border bg-surface-elevated pl-9 pr-3 py-2 text-[12px] text-text-body outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-text-muted"
                />
              </div>

              {results.length === 0 && (
                <div className="py-3 text-center text-[11px] text-text-subtitle">
                  No applications match “{query.trim()}”.
                </div>
              )}

              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                <AnimatePresence initial={false}>
                  {results.map((app) => {
                    const isAdded = addedIds.includes(app.id);
                    const isAdding = addingId === app.id;
                    return (
                      <motion.button
                        key={app.id}
                        layout
                        onClick={(): void => {
                          void handlePick(app.id, app.name, app.exec, app.comment);
                        }}
                        disabled={isAdded || isAdding}
                        title={`${app.name} — ${app.exec}`}
                        className={`
                          group flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-all cursor-pointer border border-transparent
                          ${
                            isAdded
                              ? "opacity-50 cursor-default bg-success-soft/40"
                              : "hover:bg-surface-hover hover:border-border"
                          }
                        `}
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 45%, #a855f7))",
                          }}
                        >
                          {app.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[12px] font-medium text-text-header truncate">
                            {app.name}
                          </span>
                          <span className="text-[10px] text-text-subtitle font-mono truncate">
                            {app.exec}
                          </span>
                        </div>
                        {isAdded ? (
                          <Check size={14} className="text-success shrink-0" />
                        ) : isAdding ? (
                          <Loader2 size={14} className="animate-spin text-text-subtitle shrink-0" />
                        ) : null}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>

              <button
                onClick={(): void => setShowCustom((prev) => !prev)}
                className="self-start flex items-center gap-1.5 text-[11px] text-text-subtitle hover:text-text-body transition-colors cursor-pointer mt-1"
              >
                <Terminal size={12} />
                Or add a custom command
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${showCustom ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {showCustom && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-2 pt-1">
                      <input
                        value={customName}
                        onChange={(e): void => setCustomName(e.target.value)}
                        placeholder="Name"
                        className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-[12px] text-text-body outline-none focus:border-accent"
                      />
                      <input
                        value={customCommand}
                        onChange={(e): void => setCustomCommand(e.target.value)}
                        placeholder="Command"
                        className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-[12px] text-text-body outline-none focus:border-accent font-mono"
                      />
                      <button
                        onClick={(): void => {
                          void handlePick(
                            `custom-${customName.trim()}`,
                            customName.trim(),
                            customCommand.trim(),
                            "",
                          ).then(() => {
                            setCustomName("");
                            setCustomCommand("");
                            setShowCustom(false);
                          });
                        }}
                        disabled={!canAddCustom}
                        className="self-start rounded-xl border border-border-strong bg-surface-hover px-3 py-1.5 text-[11px] font-semibold text-text-header hover:bg-surface-active disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Add custom entry
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SettingsGroup>
        </div>
      </motion.div>
    </div>
  );
};

export default StartupAppsPage;
